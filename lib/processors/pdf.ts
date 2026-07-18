import type {
  MergeOptions,
  MergeProcessor,
  MergeResult,
  UploadedFile,
  ValidationResult,
} from "./types";
import {
  addBlankPage,
  copyAllPages,
  createEmptyPdf,
  sanitizeFilename,
  stampPageNumbers,
} from "./pdfHelpers";

export const pdfProcessor: MergeProcessor = {
  validate(files: UploadedFile[], _options: MergeOptions): ValidationResult {
    const errors: string[] = [];
    if (files.length < 2) errors.push("Upload at least 2 PDF files.");
    for (const f of files) {
      if (f.mimeType !== "application/pdf") {
        errors.push(`${f.name} is not a PDF.`);
      }
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

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      await copyAllPages(doc, new Uint8Array(file.buffer!));
      if (blankBetween && i < files.length - 1) {
        addBlankPage(doc);
      }
    }

    if (Boolean(options.addPageNumbers)) {
      await stampPageNumbers(doc);
    }

    const bytes = await doc.save();
    const buffer = Buffer.from(bytes);
    const filename = `merged-${sanitizeFilename(files[0]?.name ?? "files").replace(/\.pdf$/i, "")}.pdf`;

    return {
      storageKey: `memory://${filename}`,
      filename,
      mimeType: "application/pdf",
      size: buffer.length,
      buffer,
    };
  },
};
