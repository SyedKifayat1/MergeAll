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
  const usableHeight = pageHeight - margin * 2;

  const body = text.length > 200_000 ? `${text.slice(0, 200_000)}\n\n[Truncated…]` : text;
  const lines = wrapLines(body, font, fontSize, maxWidth);
  const titleLines = options.title
    ? wrapLines(options.title, bold, 14, maxWidth)
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
