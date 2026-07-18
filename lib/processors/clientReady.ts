import type { MergeTypeId } from "@/lib/config/mergeTypes";

/** Client-safe list of sync merge types that are wired end-to-end. */
export const IMPLEMENTED_SYNC_TYPES = new Set<MergeTypeId>([
  "any-to-pdf",
  "pdf",
  "images-to-pdf",
  "docx",
  "xlsx",
  "pptx",
  "text",
  "audio",
  "video",
]);

export function isSyncMergeReady(type: MergeTypeId): boolean {
  return IMPLEMENTED_SYNC_TYPES.has(type);
}
