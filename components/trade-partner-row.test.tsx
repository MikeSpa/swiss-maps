import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PartnerRow } from './trade-partner-row'
import type { TradePartner, SectorsData } from '@/lib/trade'

const partner: TradePartner = {
  country: 'Germany',
  country_code: 'DE',
  exports: 1000,
  imports: 800,
  balance: 200,
  fta_status: 'EU_bilateral',
}

const sectorsData: SectorsData = {
  metadata: { source: 'test', year: 2024, note: '' },
  by_country: {
    DE: {
      exports: [{ sector: 'Pharma', sector_code: 'CHEM_PHARMA', share_pct: 25, value_CHF_millions: 250 }],
      imports: [{ sector: 'Pharma', sector_code: 'CHEM_PHARMA', share_pct: 10, value_CHF_millions: 80 }],
    },
  },
}

const baseProps = {
  partner,
  isHovered: false,
  isSelected: false,
  onHover: () => {},
  onSelect: () => {},
  maxForBar: 2000,
  sectorFilter: null,
  sectorsData: null,
  sortMode: 'volume' as const,
}

describe('PartnerRow', () => {
  it('renders the country name and a positive balance in green', () => {
    render(<PartnerRow {...baseProps} />)
    expect(screen.getByText('Germany')).toBeInTheDocument()
    const balance = screen.getByText('+200M')
    expect(balance).toHaveClass('text-green-600')
  })

  it('renders a negative balance without a plus sign, in red', () => {
    const negPartner: TradePartner = { ...partner, balance: -200, exports: 400, imports: 600 }
    render(<PartnerRow {...baseProps} partner={negPartner} />)
    const balance = screen.getByText('-200M')
    expect(balance).toHaveClass('text-red-500')
  })

  it('renders raw export/import totals when no sector filter is active', () => {
    render(<PartnerRow {...baseProps} />)
    expect(screen.getByText('↑1.0B')).toBeInTheDocument()
    expect(screen.getByText('↓800M')).toBeInTheDocument()
  })

  it('sizes the volume bar relative to maxForBar', () => {
    const { container } = render(<PartnerRow {...baseProps} maxForBar={2000} />)
    const bar = container.querySelector('.h-full.rounded-full') as HTMLElement
    // (1000 + 800) / 2000 = 90%
    expect(bar.style.width).toBe('90%')
  })

  it('shows sector-specific exp/imp shares when a sector filter is active', () => {
    render(
      <PartnerRow
        {...baseProps}
        sectorFilter="CHEM_PHARMA"
        sectorsData={sectorsData}
      />,
    )
    expect(screen.getByText(/↑ 250M/)).toBeInTheDocument()
    expect(screen.getByText('(25%)')).toBeInTheDocument()
    expect(screen.getByText(/↓ 80M/)).toBeInTheDocument()
    expect(screen.getByText('(10%)')).toBeInTheDocument()
  })

  it('shows the sector share badge only in "share" sort mode', () => {
    const { rerender } = render(
      <PartnerRow {...baseProps} sectorFilter="CHEM_PHARMA" sectorsData={sectorsData} sortMode="volume" />,
    )
    expect(screen.queryByText('25%')).not.toBeInTheDocument()

    rerender(
      <PartnerRow {...baseProps} sectorFilter="CHEM_PHARMA" sectorsData={sectorsData} sortMode="share" />,
    )
    expect(screen.getByText('25%')).toBeInTheDocument()
  })

  it('applies highlight classes when hovered or selected', () => {
    const { rerender } = render(<PartnerRow {...baseProps} isHovered={true} />)
    expect(screen.getByRole('button')).toHaveClass('bg-muted/70')

    rerender(<PartnerRow {...baseProps} isSelected={true} />)
    expect(screen.getByRole('button')).toHaveClass('ring-1')
  })

  it('calls onSelect when clicked and onHover on mouse enter/leave', async () => {
    const onSelect = vi.fn()
    const onHover = vi.fn()
    render(<PartnerRow {...baseProps} onSelect={onSelect} onHover={onHover} />)

    const row = screen.getByRole('button')
    await userEvent.hover(row)
    expect(onHover).toHaveBeenCalledWith('DE')

    await userEvent.unhover(row)
    expect(onHover).toHaveBeenLastCalledWith(null)

    await userEvent.click(row)
    expect(onSelect).toHaveBeenCalledWith('DE')
  })
})
