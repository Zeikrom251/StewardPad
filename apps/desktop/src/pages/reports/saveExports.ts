// Every Reports-page file: a Save dialog in the export folder, named after the session.
import type { CsvDelimiter, CsvVariant } from '@stewardpad/shared'
import { backend } from '../../backend/backend'
import { saveDialog } from '../../lib/saveDialog'
import { renderDecisionsDocument, type DocumentOptions } from './document/renderDocument'

/** "lmu-incidents-sebring-2026-09-29": the backend's own name for this session's files. */
export async function exportBaseName(): Promise<string> {
  const { filename } = await backend.exportCsv('drivers', 'semicolon')
  return filename.replace(/\.csv$/, '')
}

export async function saveDecisionsHtml(
  options: DocumentOptions,
  folder: string,
): Promise<string | null> {
  const path = await saveDialog(folder, `${await exportBaseName()}-decisions.html`, {
    name: 'Web page',
    extensions: ['html'],
  })
  if (!path) return null
  await backend.saveHtml(path, renderDecisionsDocument(options))
  return path
}

/**
 * The system print dialog on the document alone, from a hidden frame: its "Save as PDF" /
 * "Microsoft Print to PDF" printer makes the PDF, so no PDF library is needed.
 */
export function printDecisions(options: DocumentOptions): void {
  const frame = document.createElement('iframe')
  frame.title = 'Stewards decisions'
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden'
  frame.srcdoc = renderDecisionsDocument(options)
  frame.addEventListener('load', () => {
    const view = frame.contentWindow
    if (!view) return frame.remove()
    view.addEventListener('afterprint', () => frame.remove())
    view.print()
  })
  document.body.append(frame)
}

const CSV_SUFFIX: Record<CsvVariant, string> = {
  full: '',
  drivers: '-drivers',
  penalties: '-penalties',
}

export async function saveCsv(
  variant: CsvVariant,
  delimiter: CsvDelimiter,
  folder: string,
): Promise<string | null> {
  const path = await saveDialog(folder, `${await exportBaseName()}${CSV_SUFFIX[variant]}.csv`, {
    name: 'CSV',
    extensions: ['csv'],
  })
  if (!path) return null
  await backend.saveCsv(variant, delimiter, path)
  return path
}

export async function saveResultsJson(folder: string): Promise<string | null> {
  const path = await saveDialog(folder, `${await exportBaseName()}-results.json`, {
    name: 'JSON',
    extensions: ['json'],
  })
  if (!path) return null
  await backend.saveResultsJson(path)
  return path
}
