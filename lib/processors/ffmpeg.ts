import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

export async function withTempDir<T>(
  fn: (dir: string) => Promise<T>
): Promise<T> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mergeall-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

export async function writeTempFile(
  dir: string,
  name: string,
  buffer: Buffer
): Promise<string> {
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

function runFfmpeg(command: ffmpeg.FfmpegCommand): Promise<void> {
  return new Promise((resolve, reject) => {
    command
      .on("end", () => resolve())
      .on("error", (err: Error) => reject(err))
      .run();
  });
}

/** Concatenate media files with ffmpeg concat demuxer (stream copy when possible). */
export async function ffmpegConcat(
  inputPaths: string[],
  outputPath: string,
  options: { reencode?: boolean; audioOnly?: boolean } = {}
): Promise<void> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg binary is not available on this server.");
  }

  const dir = path.dirname(outputPath);
  const listPath = path.join(dir, `concat-${randomUUID()}.txt`);
  const listBody = inputPaths
    .map((p) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
    .join("\n");
  await fs.writeFile(listPath, listBody, "utf8");

  const command = ffmpeg().input(listPath).inputOptions(["-f", "concat", "-safe", "0"]);

  if (options.reencode) {
    if (options.audioOnly) {
      command.outputOptions(["-c:a", "libmp3lame", "-q:a", "2"]);
    } else {
      command.outputOptions([
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-movflags",
        "+faststart",
      ]);
    }
  } else {
    command.outputOptions(["-c", "copy"]);
  }

  command.output(outputPath);
  try {
    await runFfmpeg(command);
  } catch (err) {
    if (!options.reencode) {
      // Retry with re-encode when stream copy fails (mixed codecs).
      await ffmpegConcat(inputPaths, outputPath, {
        ...options,
        reencode: true,
      });
      return;
    }
    throw err;
  } finally {
    await fs.unlink(listPath).catch(() => undefined);
  }
}

/** Insert silence and concat audio into one file. */
export async function ffmpegConcatAudioWithGaps(
  inputPaths: string[],
  outputPath: string,
  silenceGapSec: number,
  outputFormat: "mp3" | "wav"
): Promise<void> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg binary is not available on this server.");
  }

  if (silenceGapSec <= 0) {
    await ffmpegConcat(inputPaths, outputPath, {
      reencode: true,
      audioOnly: true,
    });
    return;
  }

  // Build filter_complex: [0][sil][1][sil][2] concat
  const dir = path.dirname(outputPath);
  const silencePath = path.join(dir, `silence-${randomUUID()}.${outputFormat}`);

  const silenceCmd = ffmpeg()
    .input(`anullsrc=r=44100:cl=stereo`)
    .inputOptions(["-f", "lavfi"])
    .duration(silenceGapSec);
  if (outputFormat === "mp3") {
    silenceCmd.outputOptions(["-c:a", "libmp3lame", "-q:a", "2"]);
  } else {
    silenceCmd.outputOptions(["-c:a", "pcm_s16le"]);
  }
  silenceCmd.output(silencePath);
  await runFfmpeg(silenceCmd);

  const sequence: string[] = [];
  for (let i = 0; i < inputPaths.length; i++) {
    sequence.push(inputPaths[i]!);
    if (i < inputPaths.length - 1) sequence.push(silencePath);
  }

  await ffmpegConcat(sequence, outputPath, {
    reencode: true,
    audioOnly: true,
  });

  await fs.unlink(silencePath).catch(() => undefined);
}

export function mediaExt(name: string, fallback: string): string {
  const ext = path.extname(name).toLowerCase();
  return ext || fallback;
}
