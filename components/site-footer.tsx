import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-muted/30">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} MergeAll. Files are never claimed as ours —
          you keep full rights to everything you upload.
        </p>
        <div className="flex gap-4">
          <Link href="/#privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/#tools" className="hover:text-foreground">
            Tools
          </Link>
        </div>
      </div>
    </footer>
  );
}
