import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="relative z-20 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-(family-name:--font-display) text-lg font-semibold tracking-tight text-foreground"
        >
          Merge<span className="text-brand">All</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label="Primary">
          <Link
            href="/#tools"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Tools
          </Link>
          <Link
            href="/#privacy"
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
