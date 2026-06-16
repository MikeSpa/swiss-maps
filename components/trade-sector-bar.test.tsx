import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SectorBar } from './trade-sector-bar'
import type { SectorEntry } from '@/lib/trade'

const entry: SectorEntry = {
  sector: 'Pharma',
  sector_code: 'CHEM_PHARMA',
  share_pct: 25,
  value_CHF_millions: 100,
}

describe('SectorBar', () => {
  it('renders the sector label and share percentage', () => {
    render(<SectorBar entry={entry} color="#6366f1" bilateralTotal={1000} />)
    expect(screen.getByText('Pharma')).toBeInTheDocument()
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('formats the CHF value as share% of the bilateral total', () => {
    render(<SectorBar entry={entry} color="#6366f1" bilateralTotal={1000} />)
    // 25% of 1000M = 250M
    expect(screen.getByText('250M')).toBeInTheDocument()
  })

  it('renders the bar fill with the share percentage as width and the given color', () => {
    const { container } = render(<SectorBar entry={entry} color="#6366f1" bilateralTotal={1000} />)
    const fill = container.querySelector('.h-full.rounded-full') as HTMLElement
    expect(fill.style.width).toBe('25%')
    expect(fill.style.backgroundColor).toBe('rgb(99, 102, 241)')
  })
})
