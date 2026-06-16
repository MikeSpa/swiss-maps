import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '@/test/test-utils'
import { AppSidebar } from './app-sidebar'
import type { VotationData, VotationEntry, Resultat } from '@/lib/votation'
import type { DemographicData } from '@/lib/demographics'
import type { ErlaeuterungenData } from '@/lib/erlaeuterungen'

const emptyResultat: Resultat = {
  gebietAusgezaehlt: false,
  jaStimmenInProzent: null,
  jaStimmenAbsolut: null,
  neinStimmenAbsolut: null,
  stimmbeteiligungInProzent: null,
  eingelegteStimmzettel: null,
  anzahlStimmberechtigte: null,
  gueltigeStimmen: null,
}

function resultat(jaPct: number): Resultat {
  return { ...emptyResultat, jaStimmenInProzent: jaPct, stimmbeteiligungInProzent: 40, gebietAusgezaehlt: true }
}

const emptyStaende = {
  jaStaendeGanz: null,
  neinStaendeGanz: null,
  anzahlStaendeGanz: null,
  jaStaendeHalb: null,
  neinStaendeHalb: null,
  anzahlStaendeHalb: null,
}

const votation: VotationData = {
  abstimmtag: '2026-03-08',
  timestamp: '2026-03-08T12:00:00Z',
  vorlagen: [
    {
      vorlagenId: 1,
      vorlagenTitel: [{ langKey: 'en', text: 'Proposal One' }],
      vorlagenArtId: 1,
      doppeltesMehr: false,
      vorlageAngenommen: true,
      vorlageBeendet: true,
      staende: emptyStaende,
      resultat: resultat(60),
      kantone: [],
    },
    {
      vorlagenId: 2,
      vorlagenTitel: [{ langKey: 'en', text: 'Proposal Two' }],
      vorlagenArtId: 2,
      doppeltesMehr: false,
      vorlageAngenommen: null,
      vorlageBeendet: false,
      staende: emptyStaende,
      resultat: emptyResultat,
      kantone: [],
    },
  ],
}

const index: VotationEntry[] = [
  { date: '20260308', label: 'Mar 2026', file: '20260308.json' },
  { date: '20251130', label: 'Nov 2025', file: '20251130.json' },
]

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
  ],
  communes: {},
  cantons: {},
}

const baseProps = {
  isOpen: true,
  onClose: () => {},
  index,
  selectedDate: '20260308',
  onSelectDate: () => {},
  votation: null as VotationData | null,
  loadError: null as string | null,
  selectedVorlageId: null as number | null,
  onSelectVorlage: () => {},
  selection: null as { cantonNum: number; cantonName: string } | null,
  cantonResult: null as Resultat | null,
  cantonResults: null as Record<number, Resultat> | null,
  municipalityResults: null as Record<number, Resultat> | null,
  demoData: null as DemographicData | null,
  erlaeuterungen: null as ErlaeuterungenData | null,
}

describe('AppSidebar', () => {
  it('shows an error message when loading failed', () => {
    renderWithProviders(<AppSidebar {...baseProps} loadError="boom" />)
    expect(screen.getByText('Could not load votation data.')).toBeInTheDocument()
  })

  it('shows a loading message while votation data has not arrived', () => {
    renderWithProviders(<AppSidebar {...baseProps} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('highlights the selected date among the date buttons', () => {
    renderWithProviders(<AppSidebar {...baseProps} />)
    expect(screen.getByText('Mar 2026')).toHaveClass('bg-primary')
    expect(screen.getByText('Nov 2025')).not.toHaveClass('bg-primary')
  })

  it('calls onSelectDate and onClose when a date button is clicked', async () => {
    const onSelectDate = vi.fn()
    const onClose = vi.fn()
    renderWithProviders(<AppSidebar {...baseProps} onSelectDate={onSelectDate} onClose={onClose} />)
    await userEvent.click(screen.getByText('Nov 2025'))
    expect(onSelectDate).toHaveBeenCalledWith('20251130')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders proposal titles and types', () => {
    renderWithProviders(<AppSidebar {...baseProps} votation={votation} />)
    expect(screen.getByText('Proposal One')).toBeInTheDocument()
    expect(screen.getByText('Mandatory referendum')).toBeInTheDocument()
    expect(screen.getByText('Proposal Two')).toBeInTheDocument()
    expect(screen.getByText('Optional referendum')).toBeInTheDocument()
  })

  it('calls onSelectVorlage and onClose when a proposal is clicked', async () => {
    const onSelectVorlage = vi.fn()
    const onClose = vi.fn()
    renderWithProviders(
      <AppSidebar {...baseProps} votation={votation} onSelectVorlage={onSelectVorlage} onClose={onClose} />,
    )
    await userEvent.click(screen.getByText('Proposal One'))
    expect(onSelectVorlage).toHaveBeenCalledWith(1)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('only shows the explanations button for proposals with erlaeuterungen, and opens the modal', async () => {
    const erlaeuterungen: ErlaeuterungenData = {
      date: '20260308',
      pdf_urls: {},
      proposals: [
        {
          vorlagenId: 1,
          title_de: '',
          title_fr: '',
          title_it: '',
          title_en: '',
          title_rm: '',
          gov_rec: null,
          inkuerze_de: 'Some summary',
          inkuerze_fr: '',
          inkuerze_it: '',
        },
      ],
    }
    renderWithProviders(<AppSidebar {...baseProps} votation={votation} erlaeuterungen={erlaeuterungen} />)
    const infoButtons = screen.getAllByTitle('Federal Council Explanations')
    expect(infoButtons).toHaveLength(1)

    await userEvent.click(infoButtons[0])
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows the national result block for the selected proposal', () => {
    renderWithProviders(<AppSidebar {...baseProps} votation={votation} selectedVorlageId={1} />)
    expect(screen.getByText('National result')).toBeInTheDocument()
    expect(screen.getByText('60.0%')).toBeInTheDocument()
  })

  it('shows a "no data" message for the selected canton when no result is available', () => {
    renderWithProviders(
      <AppSidebar
        {...baseProps}
        votation={votation}
        selectedVorlageId={1}
        selection={{ cantonNum: 1, cantonName: 'Zürich' }}
        cantonResult={null}
      />,
    )
    expect(screen.getByText(/Zürich/)).toBeInTheDocument()
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('shows the canton result when available', () => {
    renderWithProviders(
      <AppSidebar
        {...baseProps}
        votation={votation}
        selectedVorlageId={1}
        selection={{ cantonNum: 1, cantonName: 'Zürich' }}
        cantonResult={resultat(45)}
      />,
    )
    expect(screen.getByText('45.0%')).toBeInTheDocument()
  })

  it('shows the correlation scatter when demographic data is available', () => {
    renderWithProviders(
      <AppSidebar {...baseProps} votation={votation} selectedVorlageId={1} demoData={demoData} />,
    )
    expect(screen.getByText('Correlation')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })
})
