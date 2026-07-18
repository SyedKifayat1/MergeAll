# MergeAll

Universal file-merging website — combine PDFs, images, Office docs, text, audio, and video into one download. Anonymous, private, 1-hour auto-delete.

## Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Framer Motion
- **Light merges:** Next.js API routes (`pdf-lib`, `sharp`, `exceljs`, etc. — added as processors land)
- **Heavy merges:** BullMQ + Redis + Node worker with **ffmpeg** (separate deploy)
- **Storage:** S3-compatible (Cloudflare R2 by default), signed URLs, 1-hour retention

## Project structure

```
app/
  (marketing)/page.tsx          # Landing
  merge/[type]/page.tsx         # Config-driven merge tools
  api/upload|merge/...          # Upload + job APIs (stubs → step 3+)
lib/
  config/mergeTypes.ts          # Single source of truth for all merge types
  processors/                   # One module per merge type
  storage.ts | queue.ts
components/                     # UI shell + shadcn
worker/                         # ffmpeg consumer (deploy separately)
```

## Local development

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build order (current progress)

| Step | Status |
|------|--------|
| 1. Scaffold + landing + `mergeTypes` config | **Done** |
| 2. Upload / reorder / options UI | **Done** |
| 3. PDF merge end-to-end (+ Images→PDF, Text, **Any→PDF**) | **Done** |
| 4. XLSX/CSV merge (native) | Pending |
| 5. DOCX + PPTX native merge | Pending (Word text→PDF works via Any→PDF) |
| 6. Redis + BullMQ + ffmpeg worker (audio/video) | Pending |
| 7. Cleanup / retention cron | Pending |
| 8. Rate limits + validation hardening | Pending |
| 9. Polish (a11y, SEO, mobile) | Partial |
| 10. Full deployment docs | Partial (this README) |

### Working right now

- **[/merge/any-to-pdf](http://localhost:3000/merge/any-to-pdf)** — mix PDF + JPG/PNG/WEBP + Word (.docx) + TXT/MD/CSV → one PDF
- `/merge/pdf` — PDF-only merge
- `/merge/images-to-pdf` — images → PDF
- `/merge/text` — concatenate text/markdown

Upload, drag-to-reorder, options, merge, and download work without Redis/R2 (in-memory processing).

## Defaults chosen

- **Storage:** Cloudflare R2
- **Limits:** 50MB / file, 20 files / job, 500MB / job (env-configurable)
- **Auth:** Anonymous only for MVP

## Deployment (overview)

1. **Vercel** — deploy the Next.js app; set env vars from `.env.example`.
2. **Worker host** (Fly.io / Railway / Render) — run `worker/` with ffmpeg installed + same Redis and R2 credentials. Required for audio/video.
3. **Redis** — Upstash or a managed Redis instance for BullMQ.

## Privacy

Files are automatically deleted after 1 hour and are never used for anything else. Uploaded content remains the user’s; MergeAll claims no rights to it.
