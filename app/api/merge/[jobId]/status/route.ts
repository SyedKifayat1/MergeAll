import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /api/merge/[jobId]/status — poll job progress.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  return NextResponse.json(
    {
      error: "Job status API not implemented yet.",
      jobId,
    },
    { status: 501 }
  );
}
