import type {
  MergeOptions,
  MergeProcessor,
  MergeResult,
  UploadedFile,
  ValidationResult,
} from "./types";
import { sanitizeFilename } from "./pdfHelpers";

function separatorFor(
  mode: string,
  name: string
): string {
  switch (mode) {
    case "hr":
      return "\n\n---\n\n";
    case "heading":
      return `\n\n## ${name}\n\n`;
    case "none":
      return "";
    case "newline":
    default:
      return "\n\n";
  }
}

export const textProcessor: MergeProcessor = {
  validate(files: UploadedFile[], _options: MergeOptions): ValidationResult {
    const errors: string[] = [];
    if (files.length < 2) errors.push("Upload at least 2 text files.");
    for (const f of files) {
      if (!f.buffer?.length) errors.push(`${f.name} is empty.`);
    }
    return { ok: errors.length === 0, errors };
  },

  async merge(
    files: UploadedFile[],
    options: MergeOptions
  ): Promise<MergeResult> {
    const sepMode = String(options.separator ?? "newline");
    const format = String(options.outputFormat ?? "txt");
    const parts = files.map((f) => {
      const text = f.buffer!.toString("utf8");
      return { name: f.name, text };
    });

    let merged = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      if (i > 0) merged += separatorFor(sepMode, part.name);
      else if (sepMode === "heading") merged += `## ${part.name}\n\n`;
      merged += part.text;
    }

    const buffer = Buffer.from(merged, "utf8");
    const ext = format === "md" ? ".md" : ".txt";
    const filename = `merged-text${ext}`;

    return {
      storageKey: `memory://${filename}`,
      filename: sanitizeFilename(filename),
      mimeType: format === "md" ? "text/markdown" : "text/plain",
      size: buffer.length,
      buffer,
    };
  },
};
