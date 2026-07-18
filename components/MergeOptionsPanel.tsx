"use client";

import type { MergeOptionField } from "@/lib/config/mergeTypes";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MergeOptionsPanelProps {
  options: MergeOptionField[];
  values: Record<string, boolean | string | number>;
  onChange: (key: string, value: boolean | string | number) => void;
  disabled?: boolean;
}

export function MergeOptionsPanel({
  options,
  values,
  onChange,
  disabled,
}: MergeOptionsPanelProps) {
  if (options.length === 0) return null;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card/60 p-5">
      <h2 className="text-sm font-medium text-foreground">Options</h2>
      <div className="space-y-4">
        {options.map((opt) => {
          if (opt.type === "boolean") {
            const checked = Boolean(values[opt.key]);
            return (
              <div key={opt.key} className="flex items-start gap-3">
                <Checkbox
                  id={opt.key}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(value) =>
                    onChange(opt.key, value === true)
                  }
                />
                <div className="space-y-0.5">
                  <Label htmlFor={opt.key} className="font-medium">
                    {opt.label}
                  </Label>
                  {opt.description ? (
                    <p className="text-xs text-muted-foreground">
                      {opt.description}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          }

          if (opt.type === "select" && opt.choices) {
            const current = String(values[opt.key] ?? opt.defaultValue);
            return (
              <div key={opt.key} className="space-y-2">
                <Label htmlFor={opt.key}>{opt.label}</Label>
                {opt.description ? (
                  <p className="text-xs text-muted-foreground">
                    {opt.description}
                  </p>
                ) : null}
                <Select
                  value={current}
                  onValueChange={(value) => {
                    if (value != null) onChange(opt.key, value);
                  }}
                  disabled={disabled}
                >
                  <SelectTrigger id={opt.key} className="w-full min-w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {opt.choices.map((choice) => (
                      <SelectItem key={choice.value} value={choice.value}>
                        {choice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }

          if (opt.type === "number") {
            return (
              <div key={opt.key} className="space-y-2">
                <Label htmlFor={opt.key}>{opt.label}</Label>
                <input
                  id={opt.key}
                  type="number"
                  className="flex h-8 w-full max-w-40 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                  value={Number(values[opt.key] ?? opt.defaultValue)}
                  min={opt.min}
                  max={opt.max}
                  step={opt.step}
                  disabled={disabled}
                  onChange={(e) => onChange(opt.key, Number(e.target.value))}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
