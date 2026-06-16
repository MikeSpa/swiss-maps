import { describe, it, expect } from 'vitest'
import { pdfViewUrl, getInkuerze, type ErlaeuterungenProposal } from './erlaeuterungen'

describe('pdfViewUrl', () => {
  it('wraps the URL in the Google Docs viewer, URL-encoded', () => {
    const url = 'https://example.com/a b.pdf'
    expect(pdfViewUrl(url)).toBe(`https://docs.google.com/viewer?url=${encodeURIComponent(url)}`)
  })
})

const baseProposal: ErlaeuterungenProposal = {
  vorlagenId: 1,
  title_de: 'Titel',
  title_fr: 'Titre',
  title_it: 'Titolo',
  title_en: 'Title',
  title_rm: 'Titel RM',
  gov_rec: 'accept',
  inkuerze_de: 'In Kürze\n\nText auf Deutsch.\n\n\n\nWeiterer Text.',
  inkuerze_fr: 'En bref\n\nTexte en français.',
  inkuerze_it: '',
}

describe('getInkuerze', () => {
  it('returns the text for the requested language, stripping the leading marker', () => {
    expect(getInkuerze(baseProposal, 'fr')).toBe('Texte en français.')
  })

  it('falls back to the German text for languages without their own field', () => {
    expect(getInkuerze(baseProposal, 'en')).toBe('Text auf Deutsch.\n\nWeiterer Text.')
  })

  it('strips standalone numeric lines and collapses extra blank lines', () => {
    const proposal: ErlaeuterungenProposal = {
      ...baseProposal,
      inkuerze_de: 'In Kürze\n\n1\n\nText.',
    }
    expect(getInkuerze(proposal, 'de')).toBe('Text.')
  })
})
