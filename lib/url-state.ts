export interface UrlState {
  date: string | null
  vorlageId: number | null
  cantonNum: number | null
}

function toInt(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null
  return parseInt(value, 10)
}

/** Parse `?d=YYYYMMDD&v=<vorlagenId>&c=<kantonsnummer>`; invalid values become null. */
export function parseUrlState(search: string): UrlState {
  const params = new URLSearchParams(search)
  const d = params.get('d')
  const c = toInt(params.get('c'))
  return {
    date: d !== null && /^\d{8}$/.test(d) ? d : null,
    vorlageId: toInt(params.get('v')),
    cantonNum: c !== null && c >= 1 && c <= 26 ? c : null,
  }
}

/** Build the query string (with leading `?`, or empty) for the given state. */
export function buildUrlSearch(state: Partial<UrlState>): string {
  const params = new URLSearchParams()
  if (state.date) params.set('d', state.date)
  if (state.vorlageId != null) params.set('v', String(state.vorlageId))
  if (state.cantonNum != null) params.set('c', String(state.cantonNum))
  const s = params.toString()
  return s ? `?${s}` : ''
}
