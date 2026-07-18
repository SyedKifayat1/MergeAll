"use client";

import { MERGE_TYPES, type MergeTypeId } from "@/lib/config/mergeTypes";

interface MergeTypeIconProps {
  typeId: MergeTypeId;
  className?: string;
}

/** Resolves icons on the client so Server Components never pass function props. */
export function MergeTypeIcon({ typeId, className }: MergeTypeIconProps) {
  const Icon = MERGE_TYPES[typeId].icon;
  return <Icon className={className} aria-hidden />;
}
