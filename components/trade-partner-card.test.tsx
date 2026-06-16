import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PartnerCard } from './trade-partner-card'
import { translations } from '@/lib/i18n'
import type { TradePartner, SectorsData } from '@/lib/trade'

const partner: TradePartner = {
  country: 'Germany',
  country_code: 'DE',
  exports: 1000,
  imports: 800,
  balance: 200,
  fta_status: 'EU_bilateral',
}

describe('PartnerCard', () => {
  it('renders the country name, FTA status, and formatted trade figures', () => {
    render(<PartnerCard partner={partner} sectorsData={null} onClose={() => {}} t={translations.en} />)
    expect(screen.getByText('Germany')).toBeInTheDocument()
    expect(screen.getByText('EU Bilateral')).toBeInTheDocument()
    expect(screen.getByText('1.0B')).toBeInTheDocument() // exports
    expect(screen.getByText('800M')).toBeInTheDocument() // imports
    expect(screen.getByText('200M')).toBeInTheDocument() // balance
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<PartnerCard partner={partner} sectorsData={null} onClose={onClose} t={translations.en} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not render sector breakdowns when no sector data is available', () => {
    render(<PartnerCard partner={partner} sectorsData={null} onClose={() => {}} t={translations.en} />)
    expect(screen.queryByText('Exports by sector')).not.toBeInTheDocument()
    expect(screen.queryByText('Imports by sector')).not.toBeInTheDocument()
  })

  it('renders sector breakdowns when sector data is available for the country', () => {
    const sectorsData: SectorsData = {
      metadata: { source: 'test', year: 2024, note: '' },
      by_country: {
        DE: {
          exports: [{ sector: 'Pharma', sector_code: 'CHEM_PHARMA', share_pct: 25, value_CHF_millions: 250 }],
          imports: [{ sector: 'Vehicles', sector_code: 'VEHICLES', share_pct: 15, value_CHF_millions: 120 }],
        },
      },
    }
    render(<PartnerCard partner={partner} sectorsData={sectorsData} onClose={() => {}} t={translations.en} />)
    expect(screen.getByText('Exports by sector')).toBeInTheDocument()
    expect(screen.getByText('Imports by sector')).toBeInTheDocument()
    expect(screen.getByText('Pharma')).toBeInTheDocument()
    expect(screen.getByText('Vehicles')).toBeInTheDocument()
  })
})
