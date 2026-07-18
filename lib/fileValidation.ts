import path from "node:path";

const EXT_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".markdown": "text/markdown",
  ".csv": "text/csv",
};

/** Magic-byte / extension checks for common merge inputs. */
export function sniffMimeType(
  buffer: Buffer,
  filename: string
): string | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") {
    return "application/pdf";
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  // ZIP-based Office formats
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
    const ext = path.extname(filename).toLowerCase();
    if (ext === ".docx") return EXT_MIME[".docx"]!;
    if (ext === ".xlsx") {
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }
    if (ext === ".pptx") {
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    }
  }

  const ext = path.extname(filename).toLowerCase();
  if (ext === ".txt" || ext === ".md" || ext === ".markdown" || ext === ".csv") {
    return EXT_MIME[ext] ?? "text/plain";
  }

  return EXT_MIME[ext] ?? null;
}

export function extensionOf(filename: string): string {
  return path.extname(filename).toLowerCase();
}

export function isAllowedExtension(
  filename: string,
  accepted: string[]
): boolean {
  return accepted.includes(extensionOf(filename));
}
