import type { MergeProcessor, MergeResult, UploadedFile, MergeOptions, ValidationResult } from "./types";

export const pptxProcessor: MergeProcessor = {
  validate(files: UploadedFile[], _options: MergeOptions): ValidationResult {
    const errors: string[] = [];
    if (files.length < 2) errors.push("Upload at least 2 PowerPoint files.");
    return { ok: errors.length === 0, errors };
  },
  async merge(_files: UploadedFile[], _options: MergeOptions): Promise<MergeResult> {
    throw new Error("PPTX merge processor not implemented yet.");
  },
};
