/**
 * Shared contract for every merge processor.
 * Add a new merge type by implementing this + registering in mergeTypes.ts.
 */

export interface UploadedFile {
  id: string;
  /** Sanitized original filename */
  name: string;
  mimeType: string;
  size: number;
  /** Temporary storage key (R2/S3 object key) or local buffer path */
  storageKey: string;
  /** Optional local buffer for sync processors during early MVP */
  buffer?: Buffer;
}

export type MergeOptions = Record<string, boolean | string | number>;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface MergeResult {
  /** Storage key of the merged output */
  storageKey: string;
  filename: string;
  mimeType: string;
  size: number;
  /** In-memory bytes for sync API responses (no object storage yet) */
  buffer?: Buffer;
}

export type JobStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "completed"
  | "failed";

export interface MergeJob {
  id: string;
  mergeType: string;
  status: JobStatus;
  progress: number;
  message?: string;
  error?: string;
  result?: MergeResult;
  createdAt: string;
  expiresAt: string;
}

export interface MergeProcessor {
  validate(files: UploadedFile[], options: MergeOptions): ValidationResult;
  merge(files: UploadedFile[], options: MergeOptions): Promise<MergeResult>;
}
