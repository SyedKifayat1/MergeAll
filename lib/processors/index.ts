import type { MergeTypeId } from "@/lib/config/mergeTypes";
import type { MergeProcessor } from "./types";
import { pdfProcessor } from "./pdf";
import { imagesToPdfProcessor } from "./imagesToPdf";
import { docxProcessor } from "./docx";
import { xlsxProcessor } from "./xlsx";
import { pptxProcessor } from "./pptx";
import { textProcessor } from "./text";
import { audioProcessor } from "./audio";
import { videoProcessor } from "./video";
import { anyToPdfProcessor } from "./anyToPdf";
import {
  IMPLEMENTED_SYNC_TYPES,
  isSyncMergeReady,
} from "./clientReady";

const registry: Record<MergeTypeId, MergeProcessor> = {
  "any-to-pdf": anyToPdfProcessor,
  pdf: pdfProcessor,
  "images-to-pdf": imagesToPdfProcessor,
  docx: docxProcessor,
  xlsx: xlsxProcessor,
  pptx: pptxProcessor,
  text: textProcessor,
  audio: audioProcessor,
  video: videoProcessor,
};

export { IMPLEMENTED_SYNC_TYPES, isSyncMergeReady };

export function getProcessor(type: MergeTypeId): MergeProcessor {
  return registry[type];
}
