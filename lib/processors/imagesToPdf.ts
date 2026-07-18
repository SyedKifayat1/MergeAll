import type {
  MergeOptions,
  MergeProcessor,
  MergeResult,
  UploadedFile,
  ValidationResult,
} from "./types";
import {
  appendImageAsPage,
  createEmptyPdf,
  sanitizeFilename,
} from "./pdfHelpers";

const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const imagesToPdfProcessor: MergeProcessor = {
  validate(files: UploadedFile[], _options: MergeOptions): ValidationResult {
    const errors: string[] = [];
    if (files.length < 2) errors.push("Upload at least 2 images.");
    for (const f of files) {
      if (!IMAGE_MIMES.has(f.mimeType)) {
        errors.push(`${f.name} is not a supported image.`);
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
    const pageSize = (options.pageSize as "fit" | "a4" | "letter") || "fit";
    const orientation =
      (options.orientation as "auto" | "portrait" | "landscape") || "auto";

    for (const file of files) {
      await appendImageAsPage(doc, file.buffer!, { pageSize, orientation });
    }

    const bytes = await doc.save();
    const buffer = Buffer.from(bytes);
    const filename = `images-merged.pdf`;

    return {
      storageKey: `memory://${filename}`,
      filename: sanitizeFilename(filename),
      mimeType: "application/pdf",
      size: buffer.length,
      buffer,
    };
  },
};
