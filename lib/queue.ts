/**
 * BullMQ + Redis setup for long-running merge jobs (audio/video).
 * Wired up in build step 6 with the ffmpeg worker.
 */

export const MERGE_QUEUE_NAME = "merge-jobs";

export function isQueueConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export async function enqueueMergeJob(_jobId: string): Promise<void> {
  throw new Error("Queue not configured. Set REDIS_URL (see .env.example).");
}
