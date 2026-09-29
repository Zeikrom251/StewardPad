import type { RuleRef } from '@stewardpad/shared'

/** Empty query lists every free rule; else number prefix ("3.2" finds 3.2, 3.2.1…) or title words. */
export function searchRules(rules: RuleRef[], query: string, taken: RuleRef[] = []): RuleRef[] {
  const q = query.trim().toLowerCase()
  const free = rules.filter((r) => !taken.some((t) => t.code === r.code))
  if (!q) return free
  const byCode = free.filter((r) => r.code.toLowerCase().startsWith(q))
  const byTitle = free.filter((r) => !byCode.includes(r) && r.title.toLowerCase().includes(q))
  return [...byCode, ...byTitle]
}

/** "3" is a chapter, "3.2" one level in, "4.1.a" two; deeper ones indent like level 3. */
export const ruleDepth = (code: string) => Math.min(code.split('.').length - 1, 3)

/**
 * The chosen rules in rule-book order, so exports read 3.3.a before 3.7.f whatever the
 * click order. A rule cited before the book changed keeps its place at the end.
 */
export function inBookOrder(book: RuleRef[], previous: RuleRef[], chosen: string[]): RuleRef[] {
  const fromBook = book.filter((r) => chosen.includes(r.code))
  const kept = previous.filter(
    (r) => chosen.includes(r.code) && !book.some((b) => b.code === r.code),
  )
  return [...fromBook, ...kept]
}
