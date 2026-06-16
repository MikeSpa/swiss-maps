import { jsonFetch } from './fetch'

export interface VorlageTitle {
  langKey: string
  text: string
}

export interface Resultat {
  gebietAusgezaehlt: boolean
  jaStimmenInProzent: number | null
  jaStimmenAbsolut: number | null
  neinStimmenAbsolut: number | null
  stimmbeteiligungInProzent: number | null
  eingelegteStimmzettel: number | null
  anzahlStimmberechtigte: number | null
  gueltigeStimmen: number | null
}

export interface Staende {
  jaStaendeGanz: number | null
  neinStaendeGanz: number | null
  anzahlStaendeGanz: number | null
  jaStaendeHalb: number | null
  neinStaendeHalb: number | null
  anzahlStaendeHalb: number | null
}

export interface KantonVote {
  geoLevelnummer: string // "1"–"26"
  geoLevelname: string
  resultat: Resultat
  bezirke: BezirkVote[]
  gemeinden: GemeindeVote[]
}

export interface BezirkVote {
  geoLevelnummer: string
  geoLevelname: string
  resultat: Resultat
}

export interface GemeindeVote {
  geoLevelnummer: string
  geoLevelname: string
  geoLevelParentnummer: string
  resultat: Resultat
}

export interface Vorlage {
  vorlagenId: number
  vorlagenTitel: VorlageTitle[]
  vorlagenArtId: number
  doppeltesMehr: boolean
  vorlageAngenommen: boolean | null
  vorlageBeendet: boolean
  staende: Staende
  resultat: Resultat
  kantone: KantonVote[]
}

export interface VotationData {
  abstimmtag: string
  timestamp: string
  vorlagen: Vorlage[]
}

export interface VotationEntry {
  date: string
  label: string
  file: string
}

// ----- helpers -----

export function getTitle(titles: VorlageTitle[], lang = 'de'): string {
  return titles.find((t) => t.langKey === lang)?.text ?? titles[0]?.text ?? ''
}

export function formatDate(abstimmtag: string): string {
  // "20260614" → "14.06.2026"
  return `${abstimmtag.slice(6, 8)}.${abstimmtag.slice(4, 6)}.${abstimmtag.slice(0, 4)}`
}

function resultMapFrom(items: { geoLevelnummer: string; resultat: Resultat }[]): Record<number, Resultat> {
  return Object.fromEntries(items.map((item) => [parseInt(item.geoLevelnummer, 10), item.resultat]))
}

function findKanton(vorlage: Vorlage, kantonNum: number): KantonVote | undefined {
  return vorlage.kantone.find((k) => parseInt(k.geoLevelnummer, 10) === kantonNum)
}

/** Map from kantonsnummer → result for a given vorlage */
export function buildCantonResultMap(vorlage: Vorlage): Record<number, Resultat> {
  return resultMapFrom(vorlage.kantone)
}

/** Map from bezirksnummer → result for a given vorlage + selected canton */
export function buildDistrictResultMap(
  vorlage: Vorlage,
  kantonNum: number,
): Record<number, Resultat> {
  const kanton = findKanton(vorlage, kantonNum)
  return kanton ? resultMapFrom(kanton.bezirke) : {}
}

/** Map from bfs_nummer → result for a given vorlage + selected canton */
export function buildMunicipalityResultMap(
  vorlage: Vorlage,
  kantonNum: number,
): Record<number, Resultat> {
  const kanton = findKanton(vorlage, kantonNum)
  return kanton ? resultMapFrom(kanton.gemeinden) : {}
}

/** Ständemehr: yes cantonal votes as a decimal (half-cantons count 0.5) */
export function staendeYes(staende: Staende): number {
  return (staende.jaStaendeGanz ?? 0) + (staende.jaStaendeHalb ?? 0) * 0.5
}

export async function fetchVotation(url: string): Promise<VotationData> {
  const raw = await jsonFetch<{ abstimmtag: string; timestamp: string; schweiz: { vorlagen: Vorlage[] } }>(
    url,
    'Votation fetch failed',
  )
  return {
    abstimmtag: raw.abstimmtag,
    timestamp: raw.timestamp,
    vorlagen: raw.schweiz.vorlagen,
  }
}
