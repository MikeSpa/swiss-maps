import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '@/test/test-utils'
import { DemographicsSidebar } from './demographics-sidebar'
import type { DemographicData } from '@/lib/demographics'

const demoData: DemographicData = {
  meta: { source: 'test', reference_year: 2024, downloaded: '2026-01-01', url: 'https://example.com' },
  groups: [
    { id: 'g1', label: { en: 'Population' } },
    { id: 'g2', label: { en: 'Economy' } },
  ],
  topics: [
    {
      id: 'pop_density',
      group: 'g1',
      label: { en: 'Population density' },
      unit: 'per km²',
      color_scale: 'sequential',
      domain: [0, 100],
      source: 'BFS',
      year: 2021,
    },
    {
      id: 'income',
      group: 'g2',
      label: { en: 'Income' },
      unit: 'CHF',
      color_scale: 'sequential',
      domain: [0, 100],
      source: 'ESTV',
      year: 2022,
    },
  ],
  communes: {},
  cantons: {},
}

const baseProps = {
  isOpen: true,
  onClose: () => {},
  data: null as DemographicData | null,
  loadError: null as string | null,
  selectedTopicId: null as string | null,
  onSelectTopic: () => {},
}

describe('DemographicsSidebar', () => {
  it('shows a loading message while data has not arrived yet', () => {
    renderWithProviders(<DemographicsSidebar {...baseProps} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows an error message when loading failed', () => {
    renderWithProviders(<DemographicsSidebar {...baseProps} loadError="boom" />)
    expect(screen.getByText('Could not load demographic data.')).toBeInTheDocument()
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it('renders topics grouped by their group label', () => {
    renderWithProviders(<DemographicsSidebar {...baseProps} data={demoData} />)
    expect(screen.getByText('Population')).toBeInTheDocument()
    expect(screen.getByText('Population density')).toBeInTheDocument()
    expect(screen.getByText('Economy')).toBeInTheDocument()
    expect(screen.getByText('Income')).toBeInTheDocument()
  })

  it('calls onSelectTopic when a topic is clicked', async () => {
    const onSelectTopic = vi.fn()
    renderWithProviders(<DemographicsSidebar {...baseProps} data={demoData} onSelectTopic={onSelectTopic} />)
    await userEvent.click(screen.getByText('Income'))
    expect(onSelectTopic).toHaveBeenCalledWith('income')
  })

  it('highlights the selected topic', () => {
    renderWithProviders(<DemographicsSidebar {...baseProps} data={demoData} selectedTopicId="income" />)
    expect(screen.getByText('Income')).toHaveClass('text-primary')
    expect(screen.getByText('Population density')).not.toHaveClass('text-primary')
  })

  it('shows the source and year for the selected topic', () => {
    renderWithProviders(<DemographicsSidebar {...baseProps} data={demoData} selectedTopicId="pop_density" />)
    expect(screen.getByText(/Source: BFS \(2021\)/)).toBeInTheDocument()
  })

  it('calls onClose when the mobile close button is clicked', async () => {
    const onClose = vi.fn()
    renderWithProviders(<DemographicsSidebar {...baseProps} data={demoData} onClose={onClose} />)
    await userEvent.click(screen.getAllByRole('button')[0])
    expect(onClose).toHaveBeenCalledOnce()
  })
})
