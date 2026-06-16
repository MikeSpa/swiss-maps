import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TradeSparkline } from './trade-sparkline'
import type { AnnualTotal } from '@/lib/trade'

describe('TradeSparkline', () => {
  it('renders nothing when fewer than two final years are available', () => {
    const annual: AnnualTotal[] = [
      { year: 2024, exports: 100, imports: 80, balance: 20, preliminary: true },
    ]
    const { container } = render(<TradeSparkline annual={annual} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the export/import lines and the first/last year labels', () => {
    const annual: AnnualTotal[] = [
      { year: 2022, exports: 100, imports: 80, balance: 20 },
      { year: 2023, exports: 120, imports: 90, balance: 30 },
      { year: 2024, exports: 150, imports: 100, balance: 50, preliminary: true },
    ]
    render(<TradeSparkline annual={annual} />)
    // 2024 is preliminary and excluded, so the range stays 2022 → 2023
    expect(screen.getByText('2022')).toBeInTheDocument()
    expect(screen.getByText('2023')).toBeInTheDocument()
    expect(screen.queryByText('2024')).not.toBeInTheDocument()
  })

  it('draws a balance area plus an export and an import line', () => {
    const annual: AnnualTotal[] = [
      { year: 2022, exports: 100, imports: 80, balance: 20 },
      { year: 2023, exports: 120, imports: 90, balance: 30 },
    ]
    const { container } = render(<TradeSparkline annual={annual} />)
    expect(container.querySelectorAll('path')).toHaveLength(3)
  })
})
