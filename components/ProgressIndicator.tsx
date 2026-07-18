"use client";

import { Progress } from "@/components/ui/progress";

interface ProgressIndicatorProps {
  progress?: number;
  status?: string;
}

export function ProgressIndicator({
  progress = 0,
  status = "Preparing…",
}: ProgressIndicatorProps) {
  return (
    <div className="space-y-2" role="status" aria-live="polite">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{status}</span>
        <span className="tabular-nums text-foreground">
          {Math.round(progress)}%
        </span>
      </div>
      <Progress value={progress} className="w-full" />
    </div>
  );
}
