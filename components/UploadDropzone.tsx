"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MergeToolConfig } from "@/lib/config/mergeToolConfig";

interface UploadDropzoneProps {
  config: MergeToolConfig;
  disabled?: boolean;
  onFilesAdded: (files: File[]) => void;
}

export function UploadDropzone({
  config,
  disabled,
  onFilesAdded,
}: UploadDropzoneProps) {
  const accept = Object.fromEntries(
    config.acceptedMimeTypes.map((mime) => [
      mime,
      config.acceptedExtensions.filter((ext) => {
        // Heuristic grouping for accept map values
        if (mime === "application/pdf") return ext === ".pdf";
        if (mime.startsWith("image/jpeg")) return [".jpg", ".jpeg"].includes(ext);
        if (mime === "image/png") return ext === ".png";
        if (mime === "image/webp") return ext === ".webp";
        if (mime.includes("wordprocessingml")) return ext === ".docx";
        if (mime === "text/plain") return ext === ".txt";
        if (mime === "text/markdown") return [".md", ".markdown"].includes(ext);
        if (mime.includes("csv")) return ext === ".csv";
        if (mime.includes("spreadsheetml")) return ext === ".xlsx";
        if (mime.includes("presentationml")) return ext === ".pptx";
        if (mime.startsWith("audio/mpeg")) return ext === ".mp3";
        if (mime.startsWith("audio/")) return ext === ".wav";
        if (mime === "video/mp4") return ext === ".mp4";
        if (mime === "video/quicktime") return ext === ".mov";
        return true;
      }),
    ])
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length) onFilesAdded(accepted);
    },
    [onFilesAdded]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop,
      accept,
      disabled,
      multiple: true,
      maxSize: config.maxFileSizeMb * 1024 * 1024,
    });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        isDragActive && !isDragReject && "border-brand bg-brand/5",
        isDragReject && "border-destructive bg-destructive/5",
        !isDragActive && "border-border bg-muted/20 hover:border-brand/40 hover:bg-muted/35",
        disabled && "pointer-events-none opacity-50"
      )}
      role="button"
      aria-label={`Upload ${config.shortLabel} files`}
    >
      <input {...getInputProps()} aria-label="Choose files to upload" />
      <span className="mb-3 inline-flex size-11 items-center justify-center rounded-xl bg-brand/15 text-brand">
        <Upload className="size-5" aria-hidden />
      </span>
      <p className="font-medium text-foreground">
        {isDragActive ? "Drop files here" : "Drag & drop files here"}
      </p>
      <p className="mt-1.5 text-sm text-muted-foreground">
        or click to browse · {config.acceptedExtensions.join(", ")}
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Up to {config.maxFiles} files · {config.maxFileSizeMb}MB each
      </p>
    </div>
  );
}
