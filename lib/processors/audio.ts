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
  ffmpegConcatAudioWithGaps,
  mediaExt,
  withTempDir,
  writeTempFile,
} from "./ffmpeg";

export const audioProcessor: MergeProcessor = {
  validate(files: UploadedFile[], _options: MergeOptions): ValidationResult {
    const errors: string[] = [];
    if (files.length < 2) errors.push("Upload at least 2 audio files.");
    for (const f of files) {
      if (!f.buffer?.length) errors.push(`${f.name} is empty.`);
    }
    return { ok: errors.length === 0, errors };
  },

  async merge(
    files: UploadedFile[],
    options: MergeOptions
  ): Promise<MergeResult> {
    const silenceGapSec = Number(options.silenceGapSec ?? 0);
    const outputFormat =
      String(options.outputFormat ?? "mp3") === "wav" ? "wav" : "mp3";
    const filename = `merged.${outputFormat}`;
    const mimeType = outputFormat === "wav" ? "audio/wav" : "audio/mpeg";

    const buffer = await withTempDir(async (dir) => {
      const inputs: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const ext = mediaExt(file.name, ".mp3");
        inputs.push(
          await writeTempFile(dir, `in-${i}${ext}`, file.buffer!)
        );
      }
      const outPath = path.join(dir, filename);
      await ffmpegConcatAudioWithGaps(
        inputs,
        outPath,
        Number.isFinite(silenceGapSec) ? Math.max(0, silenceGapSec) : 0,
        outputFormat
      );
      return fs.readFile(outPath);
    });

    return {
      storageKey: `memory://${filename}`,
      filename: sanitizeFilename(filename),
      mimeType,
      size: buffer.length,
      buffer,
    };
  },
};
