import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen, within } from '@/test/test-utils'
import { TradeSidebar } from './trade-sidebar'
import type { TradeData, SectorsData, FtaStatus } from '@/lib/trade'

const data: TradeData = {
  metadata: {
    source: 'BAZG',
    reference_year: 2024,
    currency: 'CHF',
    unit: 'millions',
    note: '',
    downloaded: '2026-01-01',
    total_exports: 3300,
    total_imports: 2000,
    trade_balance: 1300,
  },
  partners: [
    { country: 'Germany', country_code: 'DE', exports: 1000, imports: 800, balance: 200, fta_status: 'EU_bilateral' },
    { country: 'United States', country_code: 'US', exports: 2000, imports: 500, balance: 1500, fta_status: 'in_force' },
    { country: 'France', country_code: 'FR', exports: 300, imports: 700, balance: -400, fta_status: 'EU_bilateral' },
  ],
  sectors: { exports: [], imports: [] },
  timeseries: { annual: [], monthly_2025_2026: [] },
}

const sectorsData: SectorsData = {
  metadata: { source: 'test', year: 2024, note: '' },
  by_country: {
    DE: {
      exports: [{ sector: 'Pharma', sector_code: 'CHEM_PHARMA', share_pct: 25, value_CHF_millions: 250 }],
      imports: [],
    },
    US: {
      exports: [{ sector: 'Machines', sector_code: 'MACHINES_ELEC', share_pct: 10, value_CHF_millions: 200 }],
      imports: [],
    },
  },
}

const baseProps = {
  isOpen: true,
  onClose: () => {},
  data: null as TradeData | null,
  sectorsData: null as SectorsData | null,
  loadError: null as string | null,
  hoveredCode: null as string | null,
  onHover: () => {},
  selectedCode: null as string | null,
  onSelect: () => {},
  ftaFilter: 'all' as FtaStatus | 'all',
  onFtaFilter: () => {},
  sectorFilter: null as string | null,
  onSectorFilter: () => {},
}

function partnerNames(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('button span.truncate.font-medium')).map(el => el.textContent)
}

describe('TradeSidebar', () => {
  it('shows a loading message while data has not arrived yet', () => {
    renderWithProviders(<TradeSidebar {...baseProps} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows an error message when loading failed', () => {
    renderWithProviders(<TradeSidebar {...baseProps} loadError="boom" />)
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('renders the export/import/balance summary totals', () => {
    renderWithProviders(<TradeSidebar {...baseProps} data={data} />)
    expect(screen.getByText('3.3B')).toBeInTheDocument()
    expect(screen.getByText('2.0B')).toBeInTheDocument()
    expect(screen.getByText('+1.3B')).toBeInTheDocument()
  })

  it('renders all partners sorted by total trade volume', () => {
    const { container } = renderWithProviders(<TradeSidebar {...baseProps} data={data} />)
    expect(screen.getByText('Top Partners (3)')).toBeInTheDocument()
    expect(partnerNames(container)).toEqual(['United States', 'Germany', 'France'])
  })

  it('notifies the parent when an agreement filter is selected, and applies it', async () => {
    const onFtaFilter = vi.fn()
    const { container, rerender } = renderWithProviders(
      <TradeSidebar {...baseProps} data={data} onFtaFilter={onFtaFilter} />,
    )
    await userEvent.click(screen.getByText('EU'))
    expect(onFtaFilter).toHaveBeenCalledWith('EU_bilateral')

    rerender(<TradeSidebar {...baseProps} data={data} ftaFilter="EU_bilateral" onFtaFilter={onFtaFilter} />)
    expect(screen.getByText('Top Partners (2)')).toBeInTheDocument()
    expect(partnerNames(container)).toEqual(['Germany', 'France'])
  })

  it('notifies the parent when a sector filter is selected, and applies it', async () => {
    const onSectorFilter = vi.fn()
    const { container, rerender } = renderWithProviders(
      <TradeSidebar {...baseProps} data={data} sectorsData={sectorsData} onSectorFilter={onSectorFilter} />,
    )
    await userEvent.click(screen.getByText('Pharma'))
    expect(onSectorFilter).toHaveBeenCalledWith('CHEM_PHARMA')

    rerender(
      <TradeSidebar
        {...baseProps}
        data={data}
        sectorsData={sectorsData}
        sectorFilter="CHEM_PHARMA"
        onSectorFilter={onSectorFilter}
      />,
    )
    expect(screen.getByText('Pharma (1)')).toBeInTheDocument()
    expect(partnerNames(container)).toEqual(['Germany'])
    expect(screen.getByText('CHF')).toBeInTheDocument()
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('filters the partner list by search text', async () => {
    const { container } = renderWithProviders(<TradeSidebar {...baseProps} data={data} />)

    await userEvent.type(screen.getByRole('searchbox'), 'united')
    expect(screen.getByText('Top Partners (1)')).toBeInTheDocument()
    expect(partnerNames(container)).toEqual(['United States'])

    await userEvent.clear(screen.getByRole('searchbox'))
    await userEvent.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText('No match for "zzz"')).toBeInTheDocument()
  })

  it('shows a partner card for the selected country and lets the user close it', async () => {
    const onSelect = vi.fn()
    renderWithProviders(<TradeSidebar {...baseProps} data={data} selectedCode="DE" onSelect={onSelect} />)

    expect(screen.getByText('EU Bilateral')).toBeInTheDocument()

    const cardHeader = screen.getByText('Germany', { selector: 'p' }).parentElement!
    await userEvent.click(within(cardHeader).getByRole('button'))
    expect(onSelect).toHaveBeenCalledWith('DE')
  })

  it('calls onClose when the mobile close button is clicked', async () => {
    const onClose = vi.fn()
    renderWithProviders(<TradeSidebar {...baseProps} data={data} onClose={onClose} />)
    await userEvent.click(screen.getAllByRole('button', { name: '' })[0])
    expect(onClose).toHaveBeenCalledOnce()
  })
})
