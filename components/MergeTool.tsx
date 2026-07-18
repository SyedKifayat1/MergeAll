"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { MergeToolConfig } from "@/lib/config/mergeToolConfig";
import { UploadDropzone } from "@/components/UploadDropzone";
import { FileList, type ClientFileItem } from "@/components/FileList";
import { MergeOptionsPanel } from "@/components/MergeOptionsPanel";
import { ProgressIndicator } from "@/components/ProgressIndicator";
import { Button, buttonVariants } from "@/components/ui/button";
import { Download, RotateCcw } from "lucide-react";
import { isSyncMergeReady } from "@/lib/processors/clientReady";
import { cn } from "@/lib/utils";

type Phase = "edit" | "merging" | "done";

interface MergeToolProps {
  config: MergeToolConfig;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function extensionAllowed(name: string, accepted: string[]): boolean {
  const lower = name.toLowerCase();
  return accepted.some((ext) => lower.endsWith(ext));
}

export function MergeTool({ config }: MergeToolProps) {
  const [items, setItems] = useState<ClientFileItem[]>([]);
  const [options, setOptions] = useState(() =>
    Object.fromEntries(config.options.map((opt) => [opt.key, opt.defaultValue]))
  );
  const [phase, setPhase] = useState<Phase>("edit");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Preparing…");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<{
    filename: string;
    size: number;
  } | null>(null);

  const ready = isSyncMergeReady(config.id);
  const busy = phase === "merging";

  useEffect(() => {
    return () => {
      for (const item of items) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canMerge = useMemo(
    () => items.length >= config.minFiles && ready && !busy,
    [items.length, config.minFiles, ready, busy]
  );

  const addFiles = useCallback(
    (files: File[]) => {
      setItems((prev) => {
        const room = config.maxFiles - prev.length;
        if (room <= 0) {
          toast.error(`Maximum ${config.maxFiles} files.`);
          return prev;
        }

        const next: ClientFileItem[] = [];
        for (const file of files.slice(0, room)) {
          if (!extensionAllowed(file.name, config.acceptedExtensions)) {
            toast.error(`${file.name} is not an accepted type.`);
            continue;
          }
          if (file.size > config.maxFileSizeMb * 1024 * 1024) {
            toast.error(`${file.name} exceeds ${config.maxFileSizeMb}MB.`);
            continue;
          }
          next.push({
            id: crypto.randomUUID(),
            file,
            previewUrl: file.type.startsWith("image/")
              ? URL.createObjectURL(file)
              : undefined,
          });
        }

        if (files.length > room) {
          toast.message(`Only added ${room} more file(s) (limit reached).`);
        }

        return [...prev, ...next];
      });
      setPhase("edit");
      setResultUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return null;
      });
      setResultMeta(null);
    },
    [config]
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const reset = useCallback(() => {
    setItems((prev) => {
      for (const item of prev) {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      }
      return [];
    });
    setResultUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    setResultMeta(null);
    setOptions(
      Object.fromEntries(config.options.map((opt) => [opt.key, opt.defaultValue]))
    );
    setPhase("edit");
    setProgress(0);
    setStatus("Preparing…");
  }, [config]);

  async function handleMerge() {
    if (!canMerge) {
      if (!ready) {
        toast.error(
          "This merge type is not ready yet. Use Any → PDF, PDF, Images → PDF, or Text."
        );
      } else if (items.length < config.minFiles) {
        toast.error(`Add at least ${config.minFiles} files.`);
      }
      return;
    }

    setPhase("merging");
    setProgress(12);
    setStatus("Uploading files…");

    try {
      const form = new FormData();
      form.set("type", config.id);
      form.set("options", JSON.stringify(options));
      for (const item of items) {
        form.append("files", item.file, item.file.name);
      }

      setProgress(35);
      setStatus("Merging…");

      const res = await fetch("/api/merge", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        let message = "Merge failed.";
        try {
          const data = (await res.json()) as { error?: string };
          if (data.error) message = data.error;
        } catch {
          /* ignore */
        }
        throw new Error(message);
      }

      setProgress(85);
      setStatus("Preparing download…");

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] ?? `merged${config.outputExtension}`;

      const url = URL.createObjectURL(blob);
      setResultUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setResultMeta({ filename, size: blob.size });
      setProgress(100);
      setStatus("Done");
      setPhase("done");
      toast.success("Merge complete — ready to download.");
    } catch (err) {
      setPhase("edit");
      setProgress(0);
      toast.error(err instanceof Error ? err.message : "Merge failed.");
    }
  }

  if (phase === "done" && resultUrl && resultMeta) {
    return (
      <div className="mt-10 space-y-6">
        <div className="rounded-2xl border border-border bg-card/70 p-6 text-center sm:p-8">
          <p className="font-(family-name:--font-display) text-xl font-semibold">
            Your file is ready
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {resultMeta.filename} · {formatSize(resultMeta.size)}
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={resultUrl}
              download={resultMeta.filename}
              className={cn(
                buttonVariants({ size: "lg" }),
                "inline-flex items-center gap-1.5"
              )}
            >
              <Download className="size-4" />
              Download
            </a>
            <Button size="lg" variant="outline" onClick={reset}>
              <RotateCcw className="size-4" />
              Merge more
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Files are processed in memory for this session and are never stored
          longer than needed.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-6">
      {!ready && (
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Native merge for this format is coming soon. For mixed PDFs, images,
          Word, and text → one PDF, use{" "}
          <a
            href="/merge/any-to-pdf"
            className="font-medium text-brand underline-offset-2 hover:underline"
          >
            Any → PDF
          </a>
          .
        </div>
      )}

      <UploadDropzone
        config={config}
        disabled={busy}
        onFilesAdded={addFiles}
      />

      <FileList
        items={items}
        onReorder={setItems}
        onRemove={removeItem}
        disabled={busy}
      />

      <MergeOptionsPanel
        options={config.options}
        values={options}
        disabled={busy}
        onChange={(key, value) =>
          setOptions((prev) => ({ ...prev, [key]: value }))
        }
      />

      {busy && <ProgressIndicator progress={progress} status={status} />}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          className="min-w-40"
          disabled={!canMerge}
          onClick={handleMerge}
        >
          {busy ? "Merging…" : "Merge Files"}
        </Button>
        {items.length > 0 && !busy && (
          <Button variant="ghost" onClick={reset}>
            Clear
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Files are automatically deleted after processing and are never used for
        anything else.
      </p>
    </div>
  );
}
