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
 * The last printed document's frame. It goes only when the next print starts: removing it
 * on `afterprint` pulls the document from under Chromium's print routine, which can hang
 * WebView2 after a cancelled print (and WebKitGTK never fires `afterprint`, so frames piled up).
 */
let printFrame: HTMLIFrameElement | null = null

/**
 * The system print dialog on the document alone, from a hidden frame: its "Save as PDF" /
 * "Microsoft Print to PDF" printer makes the PDF, so no PDF library is needed.
 */
export function printDecisions(options: DocumentOptions): void {
  printFrame?.remove()
  const frame = document.createElement('iframe')
  frame.title = 'Stewards decisions'
  frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden'
  frame.srcdoc = renderDecisionsDocument(options)
  frame.addEventListener('load', () => frame.contentWindow?.print(), { once: true })
  document.body.append(frame)
  printFrame = frame
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
