"use client";

import { motion } from "framer-motion";
import { MERGE_TYPE_LIST } from "@/lib/config/mergeTypes";
import { MergeTypeCard } from "@/components/merge-type-card";
import { ShieldCheck, Clock, Lock } from "lucide-react";

export function LandingPage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      {/* Atmospheric background */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklch,var(--brand)_22%,transparent),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,color-mix(in_oklch,var(--brand-secondary)_14%,transparent),transparent_45%)]" />
        <div className="absolute inset-0 bg-dot-pattern" />
      </div>

      {/* Hero — brand first, one headline, one sentence, CTA */}
      <section className="relative mx-auto flex w-full max-w-6xl flex-col items-start px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="font-(family-name:--font-display) text-5xl font-bold tracking-tight text-foreground sm:text-7xl"
        >
          Merge<span className="text-brand">All</span>
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-5 max-w-xl font-(family-name:--font-display) text-2xl font-medium tracking-tight text-foreground/90 sm:text-3xl"
        >
          Merge any files, instantly.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          Drop PDFs, images, Word, and text — even mixed together — and get one
          clean PDF back. No account. No clutter.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <a
            href="/merge/any-to-pdf"
            className="inline-flex h-11 items-center justify-center rounded-full bg-brand px-6 text-sm font-medium text-brand-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            Merge any files to PDF
          </a>
          <a
            href="#privacy"
            className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-background/60 px-6 text-sm font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            How privacy works
          </a>
        </motion.div>
      </section>

      {/* Tools grid */}
      <section
        id="tools"
        className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6"
      >
        <div className="mb-8 max-w-xl">
          <h2 className="font-(family-name:--font-display) text-2xl font-semibold tracking-tight sm:text-3xl">
            Nine ways to merge
          </h2>
          <p className="mt-2 text-muted-foreground">
            Start with Any → PDF to mix formats, or pick a dedicated tool.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MERGE_TYPE_LIST.map((type, i) => (
            <MergeTypeCard key={type.id} type={type} index={i} />
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section
        id="privacy"
        className="border-t border-border/60 bg-muted/25"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-(family-name:--font-display) text-2xl font-semibold tracking-tight sm:text-3xl">
            Built for trust
          </h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Files are automatically deleted after 1 hour and are never used for
            anything else.
          </p>
          <ul className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Clock,
                title: "1-hour retention",
                body: "Uploads and results expire automatically. Nothing hangs around.",
              },
              {
                icon: Lock,
                title: "Signed access only",
                body: "Downloads use short-lived signed URLs — not public permanent links.",
              },
              {
                icon: ShieldCheck,
                title: "Your files, your rights",
                body: "We never claim ownership or train on your content.",
              },
            ].map((item) => (
              <li key={item.title} className="flex gap-3">
                <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--brand)_15%,transparent)] text-brand">
                  <item.icon className="size-4" aria-hidden />
                </span>
                <div>
                  <h3 className="font-medium text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
