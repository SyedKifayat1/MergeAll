import type {
  MergeOptions,
  MergeProcessor,
  MergeResult,
  UploadedFile,
  ValidationResult,
} from "./types";
import { mergePptxBuffers } from "./officeZip";
import { sanitizeFilename } from "./pdfHelpers";

export const pptxProcessor: MergeProcessor = {
  validate(files: UploadedFile[], _options: MergeOptions): ValidationResult {
    const errors: string[] = [];
    if (files.length < 2) errors.push("Upload at least 2 PowerPoint files.");
    for (const f of files) {
      if (!f.buffer?.length) errors.push(`${f.name} is empty.`);
    }
    return { ok: errors.length === 0, errors };
  },

  async merge(
    files: UploadedFile[],
    _options: MergeOptions
  ): Promise<MergeResult> {
    // preserveOrder is always honored — files arrive already sorted by the client.
    const buffers = files.map((f) => f.buffer!);
    const buffer = await mergePptxBuffers(buffers);
    const filename = "merged.pptx";

    return {
      storageKey: `memory://${filename}`,
      filename: sanitizeFilename(filename),
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      size: buffer.length,
      buffer,
    };
  },
};
