import path from "node:path";
import { promises as fs } from "node:fs";
import type {
  MergeOptions,
  MergeProcessor,
  MergeResult,
  UploadedFile,
  ValidationResult,
} from "./types";
import { sanitizeFilename } from "./pdfHelpers";
import {
  ffmpegConcat,
  mediaExt,
  withTempDir,
  writeTempFile,
} from "./ffmpeg";

export const videoProcessor: MergeProcessor = {
  validate(files: UploadedFile[], _options: MergeOptions): ValidationResult {
    const errors: string[] = [];
    if (files.length < 2) errors.push("Upload at least 2 video files.");
    for (const f of files) {
      if (!f.buffer?.length) errors.push(`${f.name} is empty.`);
    }
    return { ok: errors.length === 0, errors };
  },

  async merge(
    files: UploadedFile[],
    options: MergeOptions
  ): Promise<MergeResult> {
    const reencode = Boolean(options.reencode);
    const filename = "merged.mp4";

    const buffer = await withTempDir(async (dir) => {
      const inputs: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const ext = mediaExt(file.name, ".mp4");
        inputs.push(
          await writeTempFile(dir, `in-${i}${ext}`, file.buffer!)
        );
      }
      const outPath = path.join(dir, filename);
      await ffmpegConcat(inputs, outPath, { reencode, audioOnly: false });
      return fs.readFile(outPath);
    });

    return {
      storageKey: `memory://${filename}`,
      filename: sanitizeFilename(filename),
      mimeType: "video/mp4",
      size: buffer.length,
      buffer,
    };
  },
};
