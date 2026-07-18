import { NextResponse } from "next/server";

/**
 * POST /api/upload — issue signed upload URLs.
 * Implemented end-to-end with PDF merge in build step 3.
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Upload API not implemented yet. Coming in build step 3.",
    },
    { status: 501 }
  );
}
