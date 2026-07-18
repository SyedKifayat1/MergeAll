import mammoth from "mammoth";
import type {
  MergeOptions,
  MergeProcessor,
  MergeResult,
  UploadedFile,
  ValidationResult,
} from "./types";
import {
  addBlankPage,
  appendImageAsPage,
  appendTextAsPages,
  copyAllPages,
  createEmptyPdf,
  sanitizeFilename,
  stampPageNumbers,
} from "./pdfHelpers";
import { extensionOf } from "@/lib/fileValidation";

async function docxToText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value?.trim() || "(Empty Word document)";
}

async function appendFileToPdf(
  doc: Awaited<ReturnType<typeof createEmptyPdf>>,
  file: UploadedFile,
  imageOptions: {
    pageSize: "fit" | "a4" | "letter";
    orientation: "auto" | "portrait" | "landscape";
  }
): Promise<void> {
  const ext = extensionOf(file.name);
  const mime = file.mimeType;
  const buffer = file.buffer!;

  if (mime === "application/pdf" || ext === ".pdf") {
    await copyAllPages(doc, new Uint8Array(buffer));
    return;
  }

  if (
    mime.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".webp"].includes(ext)
  ) {
    await appendImageAsPage(doc, buffer, imageOptions);
    return;
  }

  if (
    mime.includes("wordprocessingml") ||
    ext === ".docx"
  ) {
    const text = await docxToText(buffer);
    await appendTextAsPages(doc, text, { title: file.name });
    return;
  }

  if (
    mime.startsWith("text/") ||
    [".txt", ".md", ".markdown", ".csv"].includes(ext)
  ) {
    await appendTextAsPages(doc, buffer.toString("utf8"), {
      title: file.name,
    });
    return;
  }

  throw new Error(
    `Unsupported file type for PDF merge: ${file.name}. Use PDF, images, Word (.docx), or text.`
  );
}

export const anyToPdfProcessor: MergeProcessor = {
  validate(files: UploadedFile[], _options: MergeOptions): ValidationResult {
    const errors: string[] = [];
    if (files.length < 2) {
      errors.push("Upload at least 2 files to merge into one PDF.");
    }
    for (const f of files) {
      if (!f.buffer?.length) errors.push(`${f.name} is empty.`);
    }
    return { ok: errors.length === 0, errors };
  },

  async merge(
    files: UploadedFile[],
    options: MergeOptions
  ): Promise<MergeResult> {
    const doc = await createEmptyPdf();
    const blankBetween = Boolean(options.blankPageBetween);
    const imageOptions = {
      pageSize: (options.pageSize as "fit" | "a4" | "letter") || "a4",
      orientation:
        (options.orientation as "auto" | "portrait" | "landscape") || "auto",
    };

    for (let i = 0; i < files.length; i++) {
      await appendFileToPdf(doc, files[i]!, imageOptions);
      if (blankBetween && i < files.length - 1) {
        addBlankPage(doc);
      }
    }

    if (Boolean(options.addPageNumbers)) {
      await stampPageNumbers(doc);
    }

    if (doc.getPageCount() === 0) {
      throw new Error("No pages were produced from the uploaded files.");
    }

    const bytes = await doc.save();
    const buffer = Buffer.from(bytes);
    const filename = "merged.pdf";

    return {
      storageKey: `memory://${filename}`,
      filename: sanitizeFilename(filename),
      mimeType: "application/pdf",
      size: buffer.length,
      buffer,
    };
  },
};
