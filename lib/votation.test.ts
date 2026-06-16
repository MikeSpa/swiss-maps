import { describe, it, expect } from 'vitest'
import {
  getTitle,
  formatDate,
  staendeYes,
  buildCantonResultMap,
  buildDistrictResultMap,
  buildMunicipalityResultMap,
  type Vorlage,
  type Resultat,
} from './votation'

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
  return { ...emptyResultat, jaStimmenInProzent: jaPct, gebietAusgezaehlt: true }
}

const vorlage: Vorlage = {
  vorlagenId: 1,
  vorlagenTitel: [
    { langKey: 'de', text: 'Vorlage DE' },
    { langKey: 'fr', text: 'Vorlage FR' },
  ],
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
  resultat: resultat(55),
  kantone: [
    {
      geoLevelnummer: '1',
      geoLevelname: 'Zürich',
      resultat: resultat(60),
      bezirke: [
        { geoLevelnummer: '101', geoLevelname: 'Bezirk Affoltern', resultat: resultat(58) },
      ],
      gemeinden: [
        {
          geoLevelnummer: '1',
          geoLevelname: 'Aeugst am Albis',
          geoLevelParentnummer: '101',
          resultat: resultat(62),
        },
      ],
    },
  ],
}

describe('getTitle', () => {
  it('returns the title for the requested language', () => {
    expect(getTitle(vorlage.vorlagenTitel, 'fr')).toBe('Vorlage FR')
  })

  it('falls back to the first title when the language is missing', () => {
    expect(getTitle(vorlage.vorlagenTitel, 'it')).toBe('Vorlage DE')
  })

  it('returns an empty string for an empty title list', () => {
    expect(getTitle([], 'de')).toBe('')
  })
})

describe('formatDate', () => {
  it('converts YYYYMMDD to DD.MM.YYYY', () => {
    expect(formatDate('20260614')).toBe('14.06.2026')
  })
})

describe('staendeYes', () => {
  it('counts half-cantons as 0.5', () => {
    expect(staendeYes(vorlage.staende)).toBe(10.5)
  })

  it('treats missing values as 0', () => {
    expect(
      staendeYes({
        jaStaendeGanz: null,
        neinStaendeGanz: null,
        anzahlStaendeGanz: null,
        jaStaendeHalb: null,
        neinStaendeHalb: null,
        anzahlStaendeHalb: null,
      }),
    ).toBe(0)
  })
})

describe('buildCantonResultMap', () => {
  it('keys results by canton number parsed from geoLevelnummer', () => {
    const map = buildCantonResultMap(vorlage)
    expect(map[1]).toEqual(resultat(60))
  })
})

describe('buildDistrictResultMap', () => {
  it('returns district results for the selected canton', () => {
    const map = buildDistrictResultMap(vorlage, 1)
    expect(map[101]).toEqual(resultat(58))
  })

  it('returns an empty map for a canton that is not present', () => {
    expect(buildDistrictResultMap(vorlage, 2)).toEqual({})
  })

  it('returns an empty map for a canton that has no districts (e.g. Geneva, Uri, Zug)', () => {
    const noDistrictVorlage: Vorlage = {
      ...vorlage,
      kantone: [
        { geoLevelnummer: '25', geoLevelname: 'Genève', resultat: resultat(55), bezirke: [], gemeinden: [] },
      ],
    }
    expect(buildDistrictResultMap(noDistrictVorlage, 25)).toEqual({})
  })
})

describe('buildMunicipalityResultMap', () => {
  it('returns municipality results for the selected canton', () => {
    const map = buildMunicipalityResultMap(vorlage, 1)
    expect(map[1]).toEqual(resultat(62))
  })

  it('returns an empty map for a canton that is not present', () => {
    expect(buildMunicipalityResultMap(vorlage, 2)).toEqual({})
  })
})
