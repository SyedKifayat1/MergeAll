import { NextResponse } from "next/server";
import {
  getMergeType,
  isMergeTypeId,
  type MergeTypeId,
} from "@/lib/config/mergeTypes";
import { getProcessor, isSyncMergeReady } from "@/lib/processors";
import type { UploadedFile } from "@/lib/processors/types";
import { sniffMimeType, isAllowedExtension } from "@/lib/fileValidation";
import { sanitizeFilename } from "@/lib/processors/pdfHelpers";

export const runtime = "nodejs";
export const maxDuration = 300;

function parseOptions(raw: string | null): Record<string, boolean | string | number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, boolean | string | number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (
        typeof value === "boolean" ||
        typeof value === "string" ||
        typeof value === "number"
      ) {
        out[key] = value;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * POST /api/merge — multipart form:
 * - type: MergeTypeId
 * - options: JSON string
 * - files: File[] (field name "files")
 */
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const typeRaw = String(form.get("type") ?? "");
    if (!isMergeTypeId(typeRaw)) {
      return NextResponse.json({ error: "Unknown merge type." }, { status: 400 });
    }
    const type = typeRaw as MergeTypeId;
    const config = getMergeType(type)!;

    if (!isSyncMergeReady(type)) {
      return NextResponse.json(
        { error: "This merge type is not available." },
        { status: 501 }
      );
    }

    const options = parseOptions(
      form.get("options") ? String(form.get("options")) : null
    );

    const blobs = form.getAll("files").filter((v): v is File => v instanceof File);
    if (blobs.length < config.minFiles) {
      return NextResponse.json(
        { error: `Upload at least ${config.minFiles} files.` },
        { status: 400 }
      );
    }
    if (blobs.length > config.maxFiles) {
      return NextResponse.json(
        { error: `Maximum ${config.maxFiles} files allowed.` },
        { status: 400 }
      );
    }

    const maxBytes = config.maxFileSizeMb * 1024 * 1024;
    const uploaded: UploadedFile[] = [];

    for (const file of blobs) {
      if (file.size > maxBytes) {
        return NextResponse.json(
          { error: `${file.name} exceeds ${config.maxFileSizeMb}MB.` },
          { status: 400 }
        );
      }
      if (!isAllowedExtension(file.name, config.acceptedExtensions)) {
        return NextResponse.json(
          {
            error: `${file.name} is not an accepted type. Allowed: ${config.acceptedExtensions.join(", ")}`,
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const sniffed = sniffMimeType(buffer, file.name);
      if (!sniffed) {
        return NextResponse.json(
          { error: `Could not verify file type for ${file.name}.` },
          { status: 400 }
        );
      }

      // Soft-check: sniffed type should be in accepted list when possible
      const accepted = new Set(config.acceptedMimeTypes);
      if (
        !accepted.has(sniffed) &&
        !(sniffed.startsWith("text/") && accepted.has("text/plain"))
      ) {
        // Allow office zip sniff mapped via extension already
        if (!isAllowedExtension(file.name, config.acceptedExtensions)) {
          return NextResponse.json(
            { error: `${file.name} failed content type validation.` },
            { status: 400 }
          );
        }
      }

      uploaded.push({
        id: crypto.randomUUID(),
        name: sanitizeFilename(file.name),
        mimeType: sniffed,
        size: buffer.length,
        storageKey: `upload://${sanitizeFilename(file.name)}`,
        buffer,
      });
    }

    const processor = getProcessor(type);
    const validation = processor.validate(uploaded, options);
    if (!validation.ok) {
      return NextResponse.json(
        { error: validation.errors.join(" ") },
        { status: 400 }
      );
    }

    const result = await processor.merge(uploaded, options);
    if (!result.buffer) {
      return NextResponse.json(
        { error: "Merge produced no output." },
        { status: 500 }
      );
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        "Content-Type": result.mimeType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Content-Length": String(result.size),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[merge]", err);
    const message =
      err instanceof Error ? err.message : "Merge failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
