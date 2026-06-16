import type { AnnualTotal } from './trade'

export function fmtB(millions: number): string {
  if (Math.abs(millions) >= 1000) return `${(millions / 1000).toFixed(1)}B`
  return `${millions.toFixed(0)}M`
}

export function yoyPct(annual: AnnualTotal[], field: 'exports' | 'imports' | 'balance'): number | null {
  const final = annual.filter(a => !a.preliminary)
  if (final.length < 2) return null
  const prev = final[final.length - 2][field]
  const curr = final[final.length - 1][field]
  if (prev === 0) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}
