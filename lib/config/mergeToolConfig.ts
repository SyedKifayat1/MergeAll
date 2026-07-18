import type {
  MergeOptionField,
  MergeTypeId,
} from "@/lib/config/mergeTypes";

/** Serializable subset of MergeTypeConfig safe to pass into client components. */
export interface MergeToolConfig {
  id: MergeTypeId;
  label: string;
  shortLabel: string;
  description: string;
  acceptedMimeTypes: string[];
  acceptedExtensions: string[];
  outputExtension: string;
  outputMimeType: string;
  requiresWorker: boolean;
  minFiles: number;
  maxFiles: number;
  maxFileSizeMb: number;
  options: MergeOptionField[];
  featured?: boolean;
}

export function toMergeToolConfig(
  config: {
    id: MergeTypeId;
    label: string;
    shortLabel: string;
    description: string;
    acceptedMimeTypes: string[];
    acceptedExtensions: string[];
    outputExtension: string;
    outputMimeType: string;
    requiresWorker: boolean;
    minFiles: number;
    maxFiles: number;
    maxFileSizeMb: number;
    options: MergeOptionField[];
    featured?: boolean;
  }
): MergeToolConfig {
  return {
    id: config.id,
    label: config.label,
    shortLabel: config.shortLabel,
    description: config.description,
    acceptedMimeTypes: config.acceptedMimeTypes,
    acceptedExtensions: config.acceptedExtensions,
    outputExtension: config.outputExtension,
    outputMimeType: config.outputMimeType,
    requiresWorker: config.requiresWorker,
    minFiles: config.minFiles,
    maxFiles: config.maxFiles,
    maxFileSizeMb: config.maxFileSizeMb,
    options: config.options,
    featured: config.featured,
  };
}
