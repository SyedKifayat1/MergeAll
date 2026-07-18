/**
 * S3-compatible storage wrapper (Cloudflare R2 by default).
 * Real signed-URL logic lands with the PDF pipeline (build step 3).
 */

export interface SignedUpload {
  uploadUrl: string;
  storageKey: string;
  expiresIn: number;
}

export interface SignedDownload {
  downloadUrl: string;
  expiresIn: number;
}

const RETENTION_SECONDS = 60 * 60; // 1 hour

export function getRetentionSeconds(): number {
  return Number(process.env.FILE_RETENTION_SECONDS ?? RETENTION_SECONDS);
}

export async function createSignedUploadUrl(
  _filename: string,
  _mimeType: string
): Promise<SignedUpload> {
  throw new Error("Storage not configured. Set R2/S3 env vars (see .env.example).");
}

export async function createSignedDownloadUrl(
  _storageKey: string
): Promise<SignedDownload> {
  throw new Error("Storage not configured. Set R2/S3 env vars (see .env.example).");
}

export async function deleteObject(_storageKey: string): Promise<void> {
  throw new Error("Storage not configured.");
}

export async function getObjectBuffer(_storageKey: string): Promise<Buffer> {
  throw new Error("Storage not configured.");
}

export async function putObject(
  _storageKey: string,
  _body: Buffer,
  _mimeType: string
): Promise<void> {
  throw new Error("Storage not configured.");
}
