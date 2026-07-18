import type {
  MergeOptions,
  MergeProcessor,
  MergeResult,
  UploadedFile,
  ValidationResult,
} from "./types";
import { mergeDocxBuffers } from "./officeZip";
import { sanitizeFilename } from "./pdfHelpers";

export const docxProcessor: MergeProcessor = {
  validate(files: UploadedFile[], _options: MergeOptions): ValidationResult {
    const errors: string[] = [];
    if (files.length < 2) errors.push("Upload at least 2 Word documents.");
    for (const f of files) {
      if (!f.buffer?.length) errors.push(`${f.name} is empty.`);
    }
    return { ok: errors.length === 0, errors };
  },

  async merge(
    files: UploadedFile[],
    options: MergeOptions
  ): Promise<MergeResult> {
    const buffers = files.map((f) => f.buffer!);
    const buffer = await mergeDocxBuffers(buffers, {
      pageBreakBetween: Boolean(options.pageBreakBetween ?? true),
    });
    const filename = "merged.docx";

    return {
      storageKey: `memory://${filename}`,
      filename: sanitizeFilename(filename),
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: buffer.length,
      buffer,
    };
  },
};
