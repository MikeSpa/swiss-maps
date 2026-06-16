import { describe, it, expect } from 'vitest'
import { renderWithProviders, screen } from '@/test/test-utils'
import { ResultBar, ResultBlock, StaendeBlock } from './result-block'
import type { Resultat, Vorlage } from '@/lib/votation'

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

describe('ResultBar', () => {
  it('uses a green bar and the percentage as width when >= 50', () => {
    const { container } = renderWithProviders(<ResultBar pct={62} />)
    const bar = container.querySelector('.bg-green-500') as HTMLElement
    expect(bar).toBeInTheDocument()
    expect(bar.style.width).toBe('62%')
  })

  it('uses a red bar when < 50', () => {
    const { container } = renderWithProviders(<ResultBar pct={30} />)
    expect(container.querySelector('.bg-red-500')).toBeInTheDocument()
  })

  it('uses a green bar at exactly 50% (boundary: pct >= 50 is green)', () => {
    const { container } = renderWithProviders(<ResultBar pct={50} />)
    expect(container.querySelector('.bg-green-500')).toBeInTheDocument()
  })
})

describe('ResultBlock', () => {
  it('shows a pending state when jaStimmenInProzent is null', () => {
    renderWithProviders(<ResultBlock result={emptyResultat} />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('shows the yes percentage, final badge, and turnout when available', () => {
    const result: Resultat = {
      ...emptyResultat,
      jaStimmenInProzent: 60,
      stimmbeteiligungInProzent: 45,
      gebietAusgezaehlt: true,
    }
    renderWithProviders(<ResultBlock result={result} />)
    expect(screen.getByText('60.0%')).toHaveClass('text-green-600')
    expect(screen.getByText('Final')).toBeInTheDocument()
    expect(screen.getByText('Turnout: 45.0%')).toBeInTheDocument()
  })

  it('uses the red color for a no-majority result', () => {
    const result: Resultat = { ...emptyResultat, jaStimmenInProzent: 40 }
    renderWithProviders(<ResultBlock result={result} />)
    expect(screen.getByText('40.0%')).toHaveClass('text-red-500')
  })

  it('shows the percentage but not a "Final" badge when counting is still in progress', () => {
    const result: Resultat = { ...emptyResultat, jaStimmenInProzent: 55, gebietAusgezaehlt: false }
    renderWithProviders(<ResultBlock result={result} />)
    expect(screen.getByText('55.0%')).toBeInTheDocument()
    expect(screen.queryByText('Final')).not.toBeInTheDocument()
  })

  it('applies the green color at exactly 50% (boundary: ja >= 50 is green)', () => {
    const result: Resultat = { ...emptyResultat, jaStimmenInProzent: 50 }
    renderWithProviders(<ResultBlock result={result} />)
    expect(screen.getByText('50.0%')).toHaveClass('text-green-600')
  })
})

const vorlage: Vorlage = {
  vorlagenId: 1,
  vorlagenTitel: [{ langKey: 'de', text: 'Vorlage' }],
  vorlagenArtId: 1,
  doppeltesMehr: true,
  vorlageAngenommen: null,
  vorlageBeendet: false,
  staende: {
    jaStaendeGanz: 10,
    neinStaendeGanz: 12,
    anzahlStaendeGanz: 20,
    jaStaendeHalb: 1,
    neinStaendeHalb: 1,
    anzahlStaendeHalb: 6,
  },
  resultat: emptyResultat,
  kantone: [],
}

describe('StaendeBlock', () => {
  it('renders nothing when doppeltesMehr is false', () => {
    const { container } = renderWithProviders(<StaendeBlock vorlage={{ ...vorlage, doppeltesMehr: false }} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a pending state when the cantonal count has not started', () => {
    const pendingVorlage: Vorlage = {
      ...vorlage,
      staende: { ...vorlage.staende, anzahlStaendeGanz: null },
    }
    renderWithProviders(<StaendeBlock vorlage={pendingVorlage} />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('shows yes/no cantonal counts, with half-cantons counted as 0.5', () => {
    renderWithProviders(<StaendeBlock vorlage={vorlage} />)
    expect(screen.getByText('10.5 Yes')).toBeInTheDocument()
    expect(screen.getByText('12.5 No')).toBeInTheDocument()
    expect(screen.getByText('of 23')).toBeInTheDocument()
  })
})
