import ExcelJS from "exceljs";
import type {
  MergeOptions,
  MergeProcessor,
  MergeResult,
  UploadedFile,
  ValidationResult,
} from "./types";
import { sanitizeFilename } from "./pdfHelpers";
import { extensionOf } from "@/lib/fileValidation";

function sheetNameFromFile(name: string, used: Set<string>): string {
  let base = name.replace(/\.[^.]+$/, "").slice(0, 28) || "Sheet";
  base = base.replace(/[\\/*?:\[\]]/g, "_");
  let candidate = base;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = `_${i++}`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

async function loadWorkbook(file: UploadedFile): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  const ext = extensionOf(file.name);
  if (ext === ".csv" || file.mimeType.includes("csv")) {
    // ExcelJS CSV: write temp-like buffer via read — use CSV parser
    const text = file.buffer!.toString("utf8");
    const sheet = wb.addWorksheet("Sheet1");
    const rows = parseCsv(text);
    for (const row of rows) {
      sheet.addRow(row);
    }
    return wb;
  }
  await wb.xlsx.load(Buffer.from(file.buffer!) as never);
  return wb;
}

/** Minimal CSV parser that handles quoted fields. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch === "\r") {
      // skip
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.length > 0));
}

export const xlsxProcessor: MergeProcessor = {
  validate(files: UploadedFile[], _options: MergeOptions): ValidationResult {
    const errors: string[] = [];
    if (files.length < 2) errors.push("Upload at least 2 spreadsheet files.");
    for (const f of files) {
      if (!f.buffer?.length) errors.push(`${f.name} is empty.`);
    }
    return { ok: errors.length === 0, errors };
  },

  async merge(
    files: UploadedFile[],
    options: MergeOptions
  ): Promise<MergeResult> {
    const mode = String(options.mode ?? "sheets");
    const out = new ExcelJS.Workbook();
    out.creator = "MergeAll";
    out.created = new Date();

    if (mode === "append") {
      const sheet = out.addWorksheet("Merged");
      let headerWritten = false;

      for (const file of files) {
        const wb = await loadWorkbook(file);
        const source = wb.worksheets[0];
        if (!source) continue;

        source.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          const values = row.values as ExcelJS.CellValue[];
          // exceljs row.values is 1-indexed
          const cells = values.slice(1);
          if (!headerWritten) {
            sheet.addRow(cells);
            headerWritten = true;
            return;
          }
          if (rowNumber === 1) {
            // skip duplicate headers from subsequent files
            return;
          }
          sheet.addRow(cells);
        });
      }
    } else {
      const used = new Set<string>();
      for (const file of files) {
        const wb = await loadWorkbook(file);
        if (wb.worksheets.length === 0) {
          out.addWorksheet(sheetNameFromFile(file.name, used));
          continue;
        }
        for (const ws of wb.worksheets) {
          const name = sheetNameFromFile(
            wb.worksheets.length > 1 ? `${file.name}-${ws.name}` : file.name,
            used
          );
          const dest = out.addWorksheet(name);
          ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
            const values = (row.values as ExcelJS.CellValue[]).slice(1);
            dest.getRow(rowNumber).values = values;
          });
          // column widths
          ws.columns?.forEach((col, idx) => {
            if (col.width) dest.getColumn(idx + 1).width = col.width;
          });
        }
      }
    }

    if (out.worksheets.length === 0) {
      throw new Error("No sheets were produced from the uploaded files.");
    }

    const arrayBuffer = await out.xlsx.writeBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = "merged.xlsx";

    return {
      storageKey: `memory://${filename}`,
      filename: sanitizeFilename(filename),
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: buffer.length,
      buffer,
    };
  },
};
