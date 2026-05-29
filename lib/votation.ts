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

// ----- helpers -----

export function getTitle(titles: VorlageTitle[], lang = 'de'): string {
  return titles.find((t) => t.langKey === lang)?.text ?? titles[0]?.text ?? ''
}

export function formatDate(abstimmtag: string): string {
  // "20260614" → "14.06.2026"
  return `${abstimmtag.slice(6, 8)}.${abstimmtag.slice(4, 6)}.${abstimmtag.slice(0, 4)}`
}

export const VORLAGE_ART: Record<number, string> = {
  1: 'Obligatorisches Referendum',
  2: 'Fakultatives Referendum',
  3: 'Volksinitiative',
  4: 'Volksinitiative',
  5: 'Gegenvorschlag',
  6: 'Stichfrage',
}

/** Map from kantonsnummer → result for a given vorlage */
export function buildCantonResultMap(vorlage: Vorlage): Record<number, Resultat> {
  return Object.fromEntries(
    vorlage.kantone.map((k) => [parseInt(k.geoLevelnummer, 10), k.resultat]),
  )
}

/** Map from bezirksnummer → result for a given vorlage + selected canton */
export function buildDistrictResultMap(
  vorlage: Vorlage,
  kantonNum: number,
): Record<number, Resultat> {
  const kanton = vorlage.kantone.find((k) => parseInt(k.geoLevelnummer, 10) === kantonNum)
  if (!kanton) return {}
  return Object.fromEntries(
    kanton.bezirke.map((b) => [parseInt(b.geoLevelnummer, 10), b.resultat]),
  )
}

/** Map from bfs_nummer → result for a given vorlage + selected canton */
export function buildMunicipalityResultMap(
  vorlage: Vorlage,
  kantonNum: number,
): Record<number, Resultat> {
  const kanton = vorlage.kantone.find((k) => parseInt(k.geoLevelnummer, 10) === kantonNum)
  if (!kanton) return {}
  return Object.fromEntries(
    kanton.gemeinden.map((g) => [parseInt(g.geoLevelnummer, 10), g.resultat]),
  )
}

/** Ständemehr: yes cantonal votes as a decimal (half-cantons count 0.5) */
export function staendeYes(staende: Staende): number {
  return (staende.jaStaendeGanz ?? 0) + (staende.jaStaendeHalb ?? 0) * 0.5
}

export async function fetchVotation(url: string): Promise<VotationData> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Votation fetch failed: ${resp.status}`)
  const raw = await resp.json()
  return {
    abstimmtag: raw.abstimmtag,
    timestamp: raw.timestamp,
    vorlagen: raw.schweiz.vorlagen,
  }
}
