export interface DemographicGroup {
  id: string
  label: Record<string, string>
}

export interface DemographicTopic {
  id: string
  group: string
  label: Record<string, string>
  unit: string
  color_scale: 'sequential' | 'diverging'
  domain: [number, number]
  source: string
  year: number
}

export interface DemographicData {
  meta: { source: string; reference_year: number; downloaded: string; url: string }
  groups: DemographicGroup[]
  topics: DemographicTopic[]
  communes: Record<string, Record<string, number>>
  cantons: Record<string, Record<string, number>>
}

export async function fetchDemographics(): Promise<DemographicData> {
  const resp = await fetch('/demographics/index.json')
  if (!resp.ok) throw new Error('Could not load demographic data')
  return resp.json()
}
