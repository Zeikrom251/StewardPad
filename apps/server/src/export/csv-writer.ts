/** Pure CSV formatting: BOM, quoting, and formula-injection guard. Prompt §7.7. */

const FORMULA_PREFIXES = ['=', '+', '-', '@']

export function escapeCsvField(raw: string, delimiter: string): string {
  const guarded = guardFormulaInjection(raw)
  const needsQuoting =
    guarded.includes(delimiter) ||
    guarded.includes('"') ||
    guarded.includes('\n') ||
    guarded.includes('\r')
  if (!needsQuoting) return guarded
  return `"${guarded.replace(/"/g, '""')}"`
}

function guardFormulaInjection(value: string): string {
  return FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value
}

export function buildCsvRow(fields: string[], delimiter: string): string {
  return fields.map((f) => escapeCsvField(f, delimiter)).join(delimiter)
}

export function buildCsv(header: string[], rows: string[][], delimiter: string): string {
  const lines = [buildCsvRow(header, delimiter), ...rows.map((row) => buildCsvRow(row, delimiter))]
  return `\uFEFF${lines.join('\r\n')}`
}
