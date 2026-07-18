import type { LucideIcon } from "lucide-react";
import {
  FileText,
  ImageIcon,
  FileSpreadsheet,
  Presentation,
  Type,
  Music,
  Video,
  Files,
  Layers,
} from "lucide-react";

/** Stable route segment / processor key for each merge tool. */
export type MergeTypeId =
  | "any-to-pdf"
  | "pdf"
  | "images-to-pdf"
  | "docx"
  | "xlsx"
  | "pptx"
  | "text"
  | "audio"
  | "video";

export type OptionFieldType = "boolean" | "select" | "number";

export interface MergeOptionField {
  key: string;
  label: string;
  description?: string;
  type: OptionFieldType;
  defaultValue: boolean | string | number;
  choices?: { label: string; value: string }[];
  min?: number;
  max?: number;
  step?: number;
}

export interface MergeTypeConfig {
  id: MergeTypeId;
  label: string;
  shortLabel: string;
  description: string;
  href: string;
  icon: LucideIcon;
  /** Accent used on landing cards / tool chrome */
  accent: string;
  acceptedMimeTypes: string[];
  acceptedExtensions: string[];
  outputExtension: string;
  outputMimeType: string;
  /** Heavy jobs (audio/video) go through BullMQ + ffmpeg worker */
  requiresWorker: boolean;
  minFiles: number;
  maxFiles: number;
  maxFileSizeMb: number;
  options: MergeOptionField[];
  seoTitle: string;
  seoDescription: string;
  /** Featured on landing / hero CTA */
  featured?: boolean;
}

/** Defaults — override via env in runtime validators later. */
export const DEFAULT_MAX_FILE_SIZE_MB = Number(
  process.env.NEXT_PUBLIC_MAX_FILE_SIZE_MB ?? 50
);
export const DEFAULT_MAX_FILES = Number(
  process.env.NEXT_PUBLIC_MAX_FILES ?? 20
);
export const DEFAULT_MAX_JOB_SIZE_MB = Number(
  process.env.NEXT_PUBLIC_MAX_JOB_SIZE_MB ?? 500
);

export const MERGE_TYPES: Record<MergeTypeId, MergeTypeConfig> = {
  "any-to-pdf": {
    id: "any-to-pdf",
    label: "Any → PDF",
    shortLabel: "Any",
    description:
      "Mix PDFs, images, Word, and text — merge everything into one PDF.",
    href: "/merge/any-to-pdf",
    icon: Layers,
    accent: "oklch(0.55 0.14 195)",
    acceptedMimeTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
      "text/csv",
    ],
    acceptedExtensions: [
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
      ".docx",
      ".txt",
      ".md",
      ".markdown",
      ".csv",
    ],
    outputExtension: ".pdf",
    outputMimeType: "application/pdf",
    requiresWorker: false,
    minFiles: 2,
    maxFiles: DEFAULT_MAX_FILES,
    maxFileSizeMb: DEFAULT_MAX_FILE_SIZE_MB,
    featured: true,
    options: [
      {
        key: "addPageNumbers",
        label: "Add page numbers",
        type: "boolean",
        defaultValue: false,
      },
      {
        key: "blankPageBetween",
        label: "Blank page between files",
        type: "boolean",
        defaultValue: false,
      },
      {
        key: "pageSize",
        label: "Page size for images & text",
        type: "select",
        defaultValue: "a4",
        choices: [
          { label: "A4", value: "a4" },
          { label: "Letter", value: "letter" },
          { label: "Fit images", value: "fit" },
        ],
      },
    ],
    seoTitle: "Merge Any Files into One PDF | MergeAll",
    seoDescription:
      "Combine PDFs, JPG, PNG, Word, and text into a single PDF. Reorder freely. Private — files deleted after use.",
  },
  pdf: {
    id: "pdf",
    label: "PDF Merge",
    shortLabel: "PDF",
    description: "Combine multiple PDFs into one document with drag-to-reorder.",
    href: "/merge/pdf",
    icon: Files,
    accent: "oklch(0.62 0.14 195)",
    acceptedMimeTypes: ["application/pdf"],
    acceptedExtensions: [".pdf"],
    outputExtension: ".pdf",
    outputMimeType: "application/pdf",
    requiresWorker: false,
    minFiles: 2,
    maxFiles: DEFAULT_MAX_FILES,
    maxFileSizeMb: DEFAULT_MAX_FILE_SIZE_MB,
    options: [
      {
        key: "addPageNumbers",
        label: "Add page numbers",
        description: "Stamp sequential page numbers on the merged PDF.",
        type: "boolean",
        defaultValue: false,
      },
      {
        key: "blankPageBetween",
        label: "Blank page between files",
        description: "Insert a blank page after each source PDF.",
        type: "boolean",
        defaultValue: false,
      },
    ],
    seoTitle: "Merge PDF Files Online — Free & Private | MergeAll",
    seoDescription:
      "Combine multiple PDF files into one. Drag to reorder, merge instantly. Files auto-delete after 1 hour.",
  },
  "images-to-pdf": {
    id: "images-to-pdf",
    label: "Images → PDF",
    shortLabel: "Images",
    description: "Turn JPG, PNG, or WEBP images into a single PDF.",
    href: "/merge/images-to-pdf",
    icon: ImageIcon,
    accent: "oklch(0.68 0.15 145)",
    acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    acceptedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
    outputExtension: ".pdf",
    outputMimeType: "application/pdf",
    requiresWorker: false,
    minFiles: 2,
    maxFiles: DEFAULT_MAX_FILES,
    maxFileSizeMb: DEFAULT_MAX_FILE_SIZE_MB,
    options: [
      {
        key: "pageSize",
        label: "Page size",
        type: "select",
        defaultValue: "fit",
        choices: [
          { label: "Fit to image", value: "fit" },
          { label: "A4", value: "a4" },
          { label: "Letter", value: "letter" },
        ],
      },
      {
        key: "orientation",
        label: "Orientation",
        type: "select",
        defaultValue: "auto",
        choices: [
          { label: "Auto", value: "auto" },
          { label: "Portrait", value: "portrait" },
          { label: "Landscape", value: "landscape" },
        ],
      },
    ],
    seoTitle: "Convert & Merge Images to PDF | MergeAll",
    seoDescription:
      "Combine JPG, PNG, and WEBP images into one PDF. Reorder freely. Private — files deleted after 1 hour.",
  },
  docx: {
    id: "docx",
    label: "Word Merge",
    shortLabel: "Word",
    description: "Merge multiple .docx documents into one Word file.",
    href: "/merge/docx",
    icon: FileText,
    accent: "oklch(0.58 0.16 250)",
    acceptedMimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    acceptedExtensions: [".docx"],
    outputExtension: ".docx",
    outputMimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    requiresWorker: false,
    minFiles: 2,
    maxFiles: DEFAULT_MAX_FILES,
    maxFileSizeMb: DEFAULT_MAX_FILE_SIZE_MB,
    options: [
      {
        key: "pageBreakBetween",
        label: "Page break between documents",
        type: "boolean",
        defaultValue: true,
      },
    ],
    seoTitle: "Merge Word Documents Online (.docx) | MergeAll",
    seoDescription:
      "Combine multiple Word .docx files into one document. Fast, private, no account required.",
  },
  xlsx: {
    id: "xlsx",
    label: "Excel / CSV Merge",
    shortLabel: "Excel",
    description: "Merge .xlsx or .csv into one workbook — sheets or rows.",
    href: "/merge/xlsx",
    icon: FileSpreadsheet,
    accent: "oklch(0.65 0.17 145)",
    acceptedMimeTypes: [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "application/csv",
    ],
    acceptedExtensions: [".xlsx", ".csv"],
    outputExtension: ".xlsx",
    outputMimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    requiresWorker: false,
    minFiles: 2,
    maxFiles: DEFAULT_MAX_FILES,
    maxFileSizeMb: DEFAULT_MAX_FILE_SIZE_MB,
    options: [
      {
        key: "mode",
        label: "Merge mode",
        description: "Separate sheets keep each file; append stacks rows.",
        type: "select",
        defaultValue: "sheets",
        choices: [
          { label: "Separate sheets", value: "sheets" },
          { label: "Append rows", value: "append" },
        ],
      },
    ],
    seoTitle: "Merge Excel & CSV Files Online | MergeAll",
    seoDescription:
      "Combine XLSX and CSV files into one workbook as sheets or appended rows.",
  },
  pptx: {
    id: "pptx",
    label: "PowerPoint Merge",
    shortLabel: "Slides",
    description: "Combine multiple .pptx decks into one presentation.",
    href: "/merge/pptx",
    icon: Presentation,
    accent: "oklch(0.62 0.18 45)",
    acceptedMimeTypes: [
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
    acceptedExtensions: [".pptx"],
    outputExtension: ".pptx",
    outputMimeType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    requiresWorker: false,
    minFiles: 2,
    maxFiles: DEFAULT_MAX_FILES,
    maxFileSizeMb: DEFAULT_MAX_FILE_SIZE_MB,
    options: [
      {
        key: "preserveOrder",
        label: "Keep slide order from file list",
        type: "boolean",
        defaultValue: true,
      },
    ],
    seoTitle: "Merge PowerPoint Presentations (.pptx) | MergeAll",
    seoDescription:
      "Combine multiple PowerPoint files into one deck. Reorder files, merge instantly.",
  },
  text: {
    id: "text",
    label: "Text Merge",
    shortLabel: "Text",
    description: "Concatenate .txt or .md files with optional separators.",
    href: "/merge/text",
    icon: Type,
    accent: "oklch(0.55 0.08 260)",
    acceptedMimeTypes: ["text/plain", "text/markdown"],
    acceptedExtensions: [".txt", ".md", ".markdown"],
    outputExtension: ".txt",
    outputMimeType: "text/plain",
    requiresWorker: false,
    minFiles: 2,
    maxFiles: DEFAULT_MAX_FILES,
    maxFileSizeMb: DEFAULT_MAX_FILE_SIZE_MB,
    options: [
      {
        key: "separator",
        label: "Separator between files",
        type: "select",
        defaultValue: "newline",
        choices: [
          { label: "Blank line", value: "newline" },
          { label: "Horizontal rule (---)", value: "hr" },
          { label: "Filename heading", value: "heading" },
          { label: "None", value: "none" },
        ],
      },
      {
        key: "outputFormat",
        label: "Output format",
        type: "select",
        defaultValue: "txt",
        choices: [
          { label: ".txt", value: "txt" },
          { label: ".md", value: "md" },
        ],
      },
    ],
    seoTitle: "Merge Text & Markdown Files | MergeAll",
    seoDescription:
      "Combine multiple text or markdown files into one, with optional separators.",
  },
  audio: {
    id: "audio",
    label: "Audio Merge",
    shortLabel: "Audio",
    description: "Concatenate MP3 or WAV clips into a single audio file.",
    href: "/merge/audio",
    icon: Music,
    accent: "oklch(0.62 0.18 320)",
    acceptedMimeTypes: ["audio/mpeg", "audio/wav", "audio/wave", "audio/x-wav"],
    acceptedExtensions: [".mp3", ".wav"],
    outputExtension: ".mp3",
    outputMimeType: "audio/mpeg",
    requiresWorker: true,
    minFiles: 2,
    maxFiles: DEFAULT_MAX_FILES,
    maxFileSizeMb: DEFAULT_MAX_FILE_SIZE_MB,
    options: [
      {
        key: "silenceGapSec",
        label: "Silence between clips (seconds)",
        type: "number",
        defaultValue: 0,
        min: 0,
        max: 10,
        step: 0.5,
      },
      {
        key: "outputFormat",
        label: "Output format",
        type: "select",
        defaultValue: "mp3",
        choices: [
          { label: "MP3", value: "mp3" },
          { label: "WAV", value: "wav" },
        ],
      },
    ],
    seoTitle: "Merge Audio Files Online (MP3, WAV) | MergeAll",
    seoDescription:
      "Concatenate MP3 and WAV files into one track. Optional silence gaps. Private processing.",
  },
  video: {
    id: "video",
    label: "Video Merge",
    shortLabel: "Video",
    description: "Concatenate MP4 or MOV videos into one file.",
    href: "/merge/video",
    icon: Video,
    accent: "oklch(0.58 0.2 25)",
    acceptedMimeTypes: ["video/mp4", "video/quicktime"],
    acceptedExtensions: [".mp4", ".mov"],
    outputExtension: ".mp4",
    outputMimeType: "video/mp4",
    requiresWorker: true,
    minFiles: 2,
    maxFiles: Math.min(DEFAULT_MAX_FILES, 10),
    maxFileSizeMb: DEFAULT_MAX_FILE_SIZE_MB,
    options: [
      {
        key: "reencode",
        label: "Re-encode for compatibility",
        description:
          "Slower but more reliable when source codecs differ. Off uses fast concat.",
        type: "boolean",
        defaultValue: false,
      },
    ],
    seoTitle: "Merge Video Files Online (MP4, MOV) | MergeAll",
    seoDescription:
      "Concatenate MP4 and MOV videos into one file. Progress tracking included.",
  },
};

/** Featured first, then the rest in a stable display order. */
export const MERGE_TYPE_LIST: MergeTypeConfig[] = [
  MERGE_TYPES["any-to-pdf"],
  MERGE_TYPES.pdf,
  MERGE_TYPES["images-to-pdf"],
  MERGE_TYPES.docx,
  MERGE_TYPES.xlsx,
  MERGE_TYPES.pptx,
  MERGE_TYPES.text,
  MERGE_TYPES.audio,
  MERGE_TYPES.video,
];

export function getMergeType(id: string): MergeTypeConfig | undefined {
  return MERGE_TYPES[id as MergeTypeId];
}

export function isMergeTypeId(id: string): id is MergeTypeId {
  return id in MERGE_TYPES;
}

/** Default options object for a merge type (key → defaultValue). */
export function getDefaultOptions(
  type: MergeTypeConfig
): Record<string, boolean | string | number> {
  return Object.fromEntries(
    type.options.map((opt) => [opt.key, opt.defaultValue])
  );
}
