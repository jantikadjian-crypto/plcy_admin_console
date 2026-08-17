/**
 * Client-side export helpers shared by every report/export surface in the
 * console. No backend — a Blob is built in the browser and handed to an
 * anchor click. Two machine-readable formats: CSV (spreadsheets) and Markdown
 * (docs / tickets). Printable PDF hand-off is handled separately by ReportShell
 * via window.print().
 */

/** Escape a single CSV cell per RFC 4180 (quote if it contains comma/quote/newline). */
function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? '')
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Build a CSV string from a header row and body rows. */
export function toCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\r\n')
}

/** Trigger a browser download of `content` as `filename`. */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const downloadCSV = (filename: string, headers: string[], rows: (string | number | null | undefined)[][]) =>
  downloadFile(filename, toCSV(headers, rows), 'text/csv;charset=utf-8')

export const downloadMarkdown = (filename: string, markdown: string) =>
  downloadFile(filename, markdown, 'text/markdown;charset=utf-8')

export const downloadJSON = (filename: string, value: unknown) =>
  downloadFile(filename, JSON.stringify(value, null, 2), 'application/json;charset=utf-8')

/** `plcy-<slug>-YYYYMMDD` — a stable, sortable filename stem for exports. */
export function reportStem(slug: string, d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `plcy-${slug}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}
