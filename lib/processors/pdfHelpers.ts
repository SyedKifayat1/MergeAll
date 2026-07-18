import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import sharp from "sharp";

export const A4 = { width: 595.28, height: 841.89 };
export const LETTER = { width: 612, height: 792 };

export async function createEmptyPdf(): Promise<PDFDocument> {
  return PDFDocument.create();
}

export async function copyAllPages(
  target: PDFDocument,
  sourceBytes: Uint8Array
): Promise<number> {
  const source = await PDFDocument.load(sourceBytes, {
    ignoreEncryption: true,
  });
  const pages = await target.copyPages(source, source.getPageIndices());
  for (const page of pages) target.addPage(page);
  return pages.length;
}

export function addBlankPage(
  doc: PDFDocument,
  size: { width: number; height: number } = A4
): PDFPage {
  return doc.addPage([size.width, size.height]);
}

/** Normalize image to PNG/JPEG bytes suitable for pdf-lib embedding. */
export async function normalizeImage(
  buffer: Buffer
): Promise<{ bytes: Buffer; kind: "png" | "jpg"; width: number; height: number }> {
  const image = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;

  if (meta.format === "jpeg") {
    const bytes = await image.jpeg({ quality: 90 }).toBuffer();
    return { bytes, kind: "jpg", width, height };
  }

  const bytes = await image.png().toBuffer();
  return { bytes, kind: "png", width, height };
}

export async function appendImageAsPage(
  doc: PDFDocument,
  buffer: Buffer,
  options: {
    pageSize?: "fit" | "a4" | "letter";
    orientation?: "auto" | "portrait" | "landscape";
  } = {}
): Promise<void> {
  const { pageSize = "fit", orientation = "auto" } = options;
  const normalized = await normalizeImage(buffer);
  const embedded =
    normalized.kind === "jpg"
      ? await doc.embedJpg(normalized.bytes)
      : await doc.embedPng(normalized.bytes);

  let pageWidth: number;
  let pageHeight: number;

  if (pageSize === "fit") {
    pageWidth = embedded.width;
    pageHeight = embedded.height;
  } else {
    const base = pageSize === "letter" ? LETTER : A4;
    const landscape =
      orientation === "landscape" ||
      (orientation === "auto" && embedded.width > embedded.height);
    pageWidth = landscape ? base.height : base.width;
    pageHeight = landscape ? base.width : base.height;
  }

  const page = doc.addPage([pageWidth, pageHeight]);
  const scale = Math.min(
    pageWidth / embedded.width,
    pageHeight / embedded.height
  );
  const drawW = embedded.width * scale;
  const drawH = embedded.height * scale;
  page.drawImage(embedded, {
    x: (pageWidth - drawW) / 2,
    y: (pageHeight - drawH) / 2,
    width: drawW,
    height: drawH,
  });
}

/**
 * Helvetica / StandardFonts only support WinAnsi. Map symbols outside that
 * encoding to ASCII so drawText does not throw (e.g. "→" / U+2192).
 * Curly quotes, dashes, and Windows-1252 extras are kept — pdf-lib maps them.
 */
const WINANSI_REPLACEMENTS: Record<string, string> = {
  "\u2190": "<-",
  "\u2191": "^",
  "\u2192": "->",
  "\u2193": "v",
  "\u21D0": "<=",
  "\u21D2": "=>",
  "\u2212": "-",
  "\u2260": "!=",
  "\u2264": "<=",
  "\u2265": ">=",
  "\u200B": "",
  "\u200C": "",
  "\u200D": "",
  "\uFEFF": "",
};

/**
 * Unicode code points Helvetica (WinAnsiEncoding) can encode via pdf-lib.
 * Includes ASCII, Latin-1 Supplement (U+00A0–FF), and Windows-1252 extras.
 */
const WINANSI_CODEPOINTS = new Set<number>([
  0x09, 0x0a, 0x0d,
  // Windows-1252 C1 replacements (Unicode form, not raw bytes)
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

function isWinAnsiCodePoint(code: number): boolean {
  if (code >= 0x20 && code <= 0x7e) return true;
  if (code >= 0xa0 && code <= 0xff) return true;
  return WINANSI_CODEPOINTS.has(code);
}

export function toWinAnsiSafe(text: string): string {
  let out = "";
  for (const ch of text) {
    if (Object.prototype.hasOwnProperty.call(WINANSI_REPLACEMENTS, ch)) {
      out += WINANSI_REPLACEMENTS[ch]!;
      continue;
    }
    const code = ch.codePointAt(0)!;
    if (code > 0xffff) {
      out += "?";
      continue;
    }
    out += isWinAnsiCodePoint(code) ? ch : "?";
  }
  return out;
}

function wrapLines(text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
        current = next;
      } else {
        if (current) lines.push(current);
        // Hard-break very long tokens
        if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
          let chunk = "";
          for (const ch of word) {
            const trial = chunk + ch;
            if (font.widthOfTextAtSize(trial, fontSize) > maxWidth) {
              if (chunk) lines.push(chunk);
              chunk = ch;
            } else {
              chunk = trial;
            }
          }
          current = chunk;
        } else {
          current = word;
        }
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

export async function appendTextAsPages(
  doc: PDFDocument,
  text: string,
  options: { title?: string } = {}
): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 11;
  const lineHeight = 16;
  const margin = 48;
  const pageWidth = A4.width;
  const pageHeight = A4.height;
  const maxWidth = pageWidth - margin * 2;

  const rawBody =
    text.length > 200_000
      ? `${text.slice(0, 200_000)}\n\n[Truncated...]`
      : text;
  const body = toWinAnsiSafe(rawBody);
  const lines = wrapLines(body, font, fontSize, maxWidth);
  const titleLines = options.title
    ? wrapLines(toWinAnsiSafe(options.title), bold, 14, maxWidth)
    : [];

  let lineIndex = 0;
  let isFirst = true;

  while (lineIndex < lines.length || isFirst) {
    const page = doc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    if (isFirst && titleLines.length) {
      for (const titleLine of titleLines) {
        page.drawText(titleLine, {
          x: margin,
          y: y - 14,
          size: 14,
          font: bold,
          color: rgb(0.12, 0.16, 0.2),
        });
        y -= 20;
      }
      y -= 8;
      isFirst = false;
    } else {
      isFirst = false;
    }

    while (lineIndex < lines.length && y - lineHeight >= margin) {
      const line = lines[lineIndex]!;
      if (line) {
        page.drawText(line, {
          x: margin,
          y: y - fontSize,
          size: fontSize,
          font,
          color: rgb(0.15, 0.15, 0.15),
        });
      }
      y -= lineHeight;
      lineIndex += 1;
    }

    if (lineIndex >= lines.length) break;
  }
}

export async function stampPageNumbers(doc: PDFDocument): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  const total = pages.length;

  pages.forEach((page, index) => {
    const { width } = page.getSize();
    const label = `${index + 1} / ${total}`;
    const size = 9;
    const textWidth = font.widthOfTextAtSize(label, size);
    page.drawText(label, {
      x: (width - textWidth) / 2,
      y: 18,
      size,
      font,
      color: rgb(0.4, 0.4, 0.4),
    });
  });
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^\w.\- ()[\]]+/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 180) || "file";
}
