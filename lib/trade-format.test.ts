import { describe, it, expect } from 'vitest'
import { fmtB, yoyPct } from './trade-format'
import type { AnnualTotal } from './trade'

describe('fmtB', () => {
  it('formats values under 1000 in millions', () => {
    expect(fmtB(500)).toBe('500M')
    expect(fmtB(999)).toBe('999M')
  })

  it('formats values of 1000 or more in billions with one decimal', () => {
    expect(fmtB(1500)).toBe('1.5B')
  })

  it('handles negative values using the absolute value for the threshold', () => {
    expect(fmtB(-2000)).toBe('-2.0B')
    expect(fmtB(-500)).toBe('-500M')
  })
})

describe('yoyPct', () => {
  const annual: AnnualTotal[] = [
    { year: 2022, exports: 100, imports: 80, balance: 20 },
    { year: 2023, exports: 120, imports: 90, balance: 30 },
    { year: 2024, exports: 150, imports: 100, balance: 50, preliminary: true },
  ]

  it('computes the percent change between the last two final years', () => {
    expect(yoyPct(annual, 'exports')).toBe(20)
    expect(yoyPct(annual, 'imports')).toBeCloseTo(12.5)
  })

  it('ignores preliminary entries when picking the last two years', () => {
    // 2024 is preliminary, so the comparison stays 2022 → 2023
    expect(yoyPct(annual, 'exports')).not.toBe(((150 - 120) / 120) * 100)
  })

  it('returns null when fewer than two final entries are available', () => {
    const single: AnnualTotal[] = [{ year: 2022, exports: 100, imports: 80, balance: 20 }]
    expect(yoyPct(single, 'exports')).toBeNull()
  })

  it('returns null when the previous value is zero', () => {
    const zeroPrev: AnnualTotal[] = [
      { year: 2022, exports: 0, imports: 0, balance: 0 },
      { year: 2023, exports: 50, imports: 10, balance: 40 },
    ]
    expect(yoyPct(zeroPrev, 'exports')).toBeNull()
    expect(yoyPct(zeroPrev, 'balance')).toBeNull()
  })
})
