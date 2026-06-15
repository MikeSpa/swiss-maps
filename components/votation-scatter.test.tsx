import { describe, it, expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '@/test/test-utils'
import { VotationScatter } from './votation-scatter'
import type { DemographicData } from '@/lib/demographics'
import type { Resultat } from '@/lib/votation'

const emptyResultat: Resultat = {
  gebietAusgezaehlt: true,
  jaStimmenInProzent: null,
  jaStimmenAbsolut: null,
  neinStimmenAbsolut: null,
  stimmbeteiligungInProzent: null,
  eingelegteStimmzettel: null,
  anzahlStimmberechtigte: null,
  gueltigeStimmen: null,
}

function resultat(jaPct: number): Resultat {
  return { ...emptyResultat, jaStimmenInProzent: jaPct }
}

const demoData: DemographicData = {
  meta: { source: 'test', reference_year: 2024, downloaded: '2026-01-01', url: 'https://example.com' },
  groups: [{ id: 'g1', label: { en: 'Demographics' } }],
  topics: [
    {
      id: 'pop_density',
      group: 'g1',
      label: { en: 'Population density' },
      unit: 'per km²',
      color_scale: 'sequential',
      domain: [0, 100],
      source: 'test',
      year: 2024,
    },
    {
      id: 'income',
      group: 'g1',
      label: { en: 'Income' },
      unit: 'CHF',
      color_scale: 'sequential',
      domain: [0, 100],
      source: 'test',
      year: 2024,
    },
  ],
  communes: {},
  cantons: {
    '1': { pop_density: 10, income: 50 },
    '2': { pop_density: 50 },
    '3': { pop_density: 90 },
  },
}

const cantonResults: Record<number, Resultat> = {
  1: resultat(10),
  2: resultat(50),
  3: resultat(90),
}

describe('VotationScatter', () => {
  it('renders one option per topic, grouped by topic group', () => {
    renderWithProviders(
      <VotationScatter
        demoData={demoData}
        cantonResults={cantonResults}
        municipalityResults={null}
        isMunicipalityLevel={false}
      />,
    )
    expect(screen.getByRole('option', { name: 'Population density' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Income' })).toBeInTheDocument()
  })

  it('shows a "Not enough data" message when fewer than 3 points are available', () => {
    renderWithProviders(
      <VotationScatter
        demoData={demoData}
        cantonResults={null}
        municipalityResults={null}
        isMunicipalityLevel={false}
      />,
    )
    expect(screen.getByText('Not enough data')).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('plots one point per canton with matching demographic and result data', () => {
    const { container } = renderWithProviders(
      <VotationScatter
        demoData={demoData}
        cantonResults={cantonResults}
        municipalityResults={null}
        isMunicipalityLevel={false}
      />,
    )
    expect(container.querySelectorAll('circle')).toHaveLength(3)
  })

  it('summarizes a perfectly correlated dataset as a strong positive correlation', () => {
    renderWithProviders(
      <VotationScatter
        demoData={demoData}
        cantonResults={cantonResults}
        municipalityResults={null}
        isMunicipalityLevel={false}
      />,
    )
    expect(screen.getByText('1.00')).toBeInTheDocument()
    expect(screen.getByText(/strong positive/)).toBeInTheDocument()
    expect(screen.getByText(/n=3/)).toBeInTheDocument()
  })

  it('switches to the "Not enough data" state when picking a topic with too few points', async () => {
    const { container } = renderWithProviders(
      <VotationScatter
        demoData={demoData}
        cantonResults={cantonResults}
        municipalityResults={null}
        isMunicipalityLevel={false}
      />,
    )
    await userEvent.selectOptions(screen.getByRole('combobox'), 'income')
    expect(screen.getByText('Not enough data')).toBeInTheDocument()
    expect(container.querySelectorAll('circle')).toHaveLength(0)
  })
})
