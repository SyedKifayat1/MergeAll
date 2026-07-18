import { NextResponse } from "next/server";

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /api/merge/[jobId]/download — redirect or return signed download URL.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { jobId } = await context.params;
  return NextResponse.json(
    {
      error: "Download API not implemented yet.",
      jobId,
    },
    { status: 501 }
  );
}
