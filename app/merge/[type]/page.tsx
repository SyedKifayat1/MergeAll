import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getMergeType,
  isMergeTypeId,
  MERGE_TYPE_LIST,
} from "@/lib/config/mergeTypes";
import { Badge } from "@/components/ui/badge";
import { MergeTool } from "@/components/MergeTool";
import { MergeTypeIcon } from "@/components/MergeTypeIcon";
import { toMergeToolConfig } from "@/lib/config/mergeToolConfig";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ type: string }>;
}

export function generateStaticParams() {
  return MERGE_TYPE_LIST.map((t) => ({ type: t.id }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { type } = await params;
  const config = getMergeType(type);
  if (!config) return { title: "Merge tool | MergeAll" };
  return {
    title: config.seoTitle,
    description: config.seoDescription,
  };
}

export default async function MergeToolPage({ params }: PageProps) {
  const { type } = await params;
  if (!isMergeTypeId(type)) notFound();

  const config = getMergeType(type)!;

  return (
    <div className="relative mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--tool-accent)_18%,transparent),transparent_70%)]"
        style={{ ["--tool-accent" as string]: config.accent }}
        aria-hidden
      />

      <Link
        href="/"
        className="-ml-2 mb-6 inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-[0.8rem] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        All tools
      </Link>

      <div className="flex items-start gap-4">
        <span
          className="inline-flex size-12 items-center justify-center rounded-2xl"
          style={{
            background: `color-mix(in oklch, ${config.accent} 18%, transparent)`,
            color: config.accent,
          }}
        >
          <MergeTypeIcon typeId={config.id} className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-(family-name:--font-display) text-3xl font-semibold tracking-tight">
              {config.label}
            </h1>
            {config.featured ? (
              <Badge variant="default">Recommended</Badge>
            ) : null}
            {config.requiresWorker ? (
              <Badge variant="secondary">ffmpeg</Badge>
            ) : null}
          </div>
          <p className="mt-2 text-muted-foreground">{config.description}</p>
        </div>
      </div>

      <MergeTool config={toMergeToolConfig(config)} />
    </div>
  );
}
