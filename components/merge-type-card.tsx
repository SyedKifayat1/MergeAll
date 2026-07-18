"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { MergeTypeConfig } from "@/lib/config/mergeTypes";
import { ArrowUpRight } from "lucide-react";

interface MergeTypeCardProps {
  type: MergeTypeConfig;
  index: number;
}

export function MergeTypeCard({ type, index }: MergeTypeCardProps) {
  const Icon = type.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={type.href}
        className="group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-5 shadow-sm outline-none transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-(--card-accent)/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-(--card-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        style={{ ["--card-accent" as string]: type.accent }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35"
          style={{ background: type.accent }}
          aria-hidden
        />
        <div className="flex items-start justify-between gap-3">
          <span
            className="inline-flex size-11 items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in oklch, ${type.accent} 18%, transparent)`,
              color: type.accent,
            }}
          >
            <Icon className="size-5" aria-hidden />
          </span>
          <ArrowUpRight
            className="size-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
            aria-hidden
          />
        </div>
        <div className="space-y-1.5">
          <h3 className="font-(family-name:--font-display) text-lg font-semibold tracking-tight text-foreground">
            {type.label}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {type.description}
          </p>
        </div>
        {type.requiresWorker ? (
          <span className="mt-auto text-xs text-muted-foreground">
            Processed via secure media worker
          </span>
        ) : (
          <span className="mt-auto text-xs text-muted-foreground">
            Instant merge
          </span>
        )}
      </Link>
    </motion.div>
  );
}
