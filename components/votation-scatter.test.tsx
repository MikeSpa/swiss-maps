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

  it('shows dots but no correlation summary when all x values are uniform (pearsonR returns null)', () => {
    const uniformDemoData: DemographicData = {
      ...demoData,
      cantons: {
        '1': { pop_density: 50 },
        '2': { pop_density: 50 },
        '3': { pop_density: 50 },
      },
    }
    const { container } = renderWithProviders(
      <VotationScatter
        demoData={uniformDemoData}
        cantonResults={cantonResults}
        municipalityResults={null}
        isMunicipalityLevel={false}
      />,
    )
    expect(container.querySelectorAll('circle')).toHaveLength(3)
    expect(screen.queryByText(/r =/)).not.toBeInTheDocument()
  })

  it('summarizes a perfectly anti-correlated dataset as a strong negative correlation', () => {
    const reverseCantonResults: Record<number, Resultat> = {
      1: resultat(90),
      2: resultat(50),
      3: resultat(10),
    }
    renderWithProviders(
      <VotationScatter
        demoData={demoData}
        cantonResults={reverseCantonResults}
        municipalityResults={null}
        isMunicipalityLevel={false}
      />,
    )
    expect(screen.getByText('-1.00')).toBeInTheDocument()
    expect(screen.getByText(/strong negative/)).toBeInTheDocument()
  })

  it('summarizes an uncorrelated dataset as "no correlation"', () => {
    const flatDemoData: DemographicData = {
      ...demoData,
      cantons: {
        '1': { pop_density: 10 },
        '2': { pop_density: 20 },
        '3': { pop_density: 30 },
      },
    }
    // y=[30,20,30] with x=[10,20,30]: num=(-10)(3.33)+(0)(-6.67)+(10)(3.33)=0 → r=0
    const flatCantonResults: Record<number, Resultat> = {
      1: resultat(30),
      2: resultat(20),
      3: resultat(30),
    }
    renderWithProviders(
      <VotationScatter
        demoData={flatDemoData}
        cantonResults={flatCantonResults}
        municipalityResults={null}
        isMunicipalityLevel={false}
      />,
    )
    expect(screen.getByText('0.00')).toBeInTheDocument()
    expect(screen.getByText(/no correlation/)).toBeInTheDocument()
  })

  it('plots municipality-level points when isMunicipalityLevel is true', () => {
    const muniDemoData: DemographicData = {
      ...demoData,
      communes: {
        '101': { pop_density: 10 },
        '201': { pop_density: 30 },
        '301': { pop_density: 70 },
        '401': { pop_density: 90 },
      },
    }
    const municipalityResults: Record<number, Resultat> = {
      101: resultat(20),
      201: resultat(40),
      301: resultat(60),
      401: resultat(80),
    }
    const { container } = renderWithProviders(
      <VotationScatter
        demoData={muniDemoData}
        cantonResults={cantonResults}
        municipalityResults={municipalityResults}
        isMunicipalityLevel={true}
      />,
    )
    // 4 circles from communes (not 3 from cantons), proving the municipality path is used
    expect(container.querySelectorAll('circle')).toHaveLength(4)
  })
})
