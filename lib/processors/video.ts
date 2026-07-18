import type { MergeProcessor, MergeResult, UploadedFile, MergeOptions, ValidationResult } from "./types";

/** Enqueues work on the ffmpeg worker via BullMQ — implemented in build step 6. */
export const videoProcessor: MergeProcessor = {
  validate(files: UploadedFile[], _options: MergeOptions): ValidationResult {
    const errors: string[] = [];
    if (files.length < 2) errors.push("Upload at least 2 video files.");
    return { ok: errors.length === 0, errors };
  },
  async merge(_files: UploadedFile[], _options: MergeOptions): Promise<MergeResult> {
    throw new Error("Video merge processor not implemented yet (requires ffmpeg worker).");
  },
};
