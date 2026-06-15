import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '@/test/test-utils'
import { VorlageInfoModal } from './vorlage-info-modal'
import type { Vorlage, Resultat } from '@/lib/votation'
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

const vorlage: Vorlage = {
  vorlagenId: 1,
  vorlagenTitel: [{ langKey: 'en', text: 'Test Proposal' }],
  vorlagenArtId: 1,
  doppeltesMehr: false,
  vorlageAngenommen: null,
  vorlageBeendet: false,
  staende: {
    jaStaendeGanz: null,
    neinStaendeGanz: null,
    anzahlStaendeGanz: null,
    jaStaendeHalb: null,
    neinStaendeHalb: null,
    anzahlStaendeHalb: null,
  },
  resultat: emptyResultat,
  kantone: [],
}

function erlaeuterungenWith(
  overrides: Partial<ErlaeuterungenData['proposals'][number]>,
  pdf_urls: ErlaeuterungenData['pdf_urls'] = {},
): ErlaeuterungenData {
  return {
    date: '20260308',
    pdf_urls,
    proposals: [
      {
        vorlagenId: 1,
        title_de: '',
        title_fr: '',
        title_it: '',
        title_en: '',
        title_rm: '',
        gov_rec: null,
        inkuerze_de: '',
        inkuerze_fr: '',
        inkuerze_it: '',
        ...overrides,
      },
    ],
  }
}

describe('VorlageInfoModal', () => {
  it('renders nothing when closed', () => {
    renderWithProviders(
      <VorlageInfoModal vorlage={vorlage} erlaeuterungen={null} open={false} onClose={() => {}} />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the proposal title and a fallback message when there is no explanatory text', () => {
    renderWithProviders(
      <VorlageInfoModal vorlage={vorlage} erlaeuterungen={null} open={true} onClose={() => {}} />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Proposal')).toBeInTheDocument()
    expect(screen.getByText('No explanatory text available.')).toBeInTheDocument()
  })

  it('shows the government recommendation badge and summary text', () => {
    const erlaeuterungen = erlaeuterungenWith({ gov_rec: 'accept', inkuerze_de: 'Kurzer Text.' })
    renderWithProviders(
      <VorlageInfoModal vorlage={vorlage} erlaeuterungen={erlaeuterungen} open={true} onClose={() => {}} />,
    )
    expect(screen.getByText('Federal Council recommends Yes')).toBeInTheDocument()
    expect(screen.getByText('Kurzer Text.')).toBeInTheDocument()
  })

  it('truncates long summaries and expands on click', async () => {
    const longText = 'A'.repeat(700)
    const erlaeuterungen = erlaeuterungenWith({ inkuerze_de: longText })
    renderWithProviders(
      <VorlageInfoModal vorlage={vorlage} erlaeuterungen={erlaeuterungen} open={true} onClose={() => {}} />,
    )
    expect(screen.getByText(`${'A'.repeat(600)}…`)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '↓ Show more' }))
    expect(screen.getByText(longText)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '↑ Show less' })).toBeInTheDocument()
  })

  it('renders a PDF link per available language', () => {
    const erlaeuterungen = erlaeuterungenWith(
      {},
      { de: 'https://example.com/de.pdf', fr: 'https://example.com/fr.pdf' },
    )
    renderWithProviders(
      <VorlageInfoModal vorlage={vorlage} erlaeuterungen={erlaeuterungen} open={true} onClose={() => {}} />,
    )
    expect(screen.getByRole('link', { name: /Full text \(PDF\) \(DE\)/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Full text \(PDF\) \(FR\)/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /\(IT\)/ })).not.toBeInTheDocument()
  })

  it('does not render a PDF footer when no PDF URLs are available', () => {
    const erlaeuterungen = erlaeuterungenWith({})
    renderWithProviders(
      <VorlageInfoModal vorlage={vorlage} erlaeuterungen={erlaeuterungen} open={true} onClose={() => {}} />,
    )
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <VorlageInfoModal vorlage={vorlage} erlaeuterungen={null} open={true} onClose={onClose} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
