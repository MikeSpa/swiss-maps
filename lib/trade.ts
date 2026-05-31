export type FtaStatus =
  | 'EU_bilateral'
  | 'in_force'
  | 'framework_agreed'
  | 'under_negotiation'
  | 'signed_not_in_force'
  | 'none'

export interface TradePartner {
  country: string
  country_code: string
  centroid?: [number, number]   // [lng, lat] — present for ~63 major partners
  exports: number               // CHF millions
  imports: number               // CHF millions
  balance: number               // exports − imports (positive = CH surplus)
  fta_status: FtaStatus
}

export interface SectorEntry {
  sector: string
  sector_code: string
  share_pct: number
  value_CHF_millions: number
}

export interface AnnualTotal {
  year: number
  exports: number
  imports: number
  balance: number
  preliminary?: boolean
}

export interface MonthlyTotal {
  period: string  // "YYYY-MM"
  exports: number
  imports: number
  preliminary?: boolean
}

export interface TradeData {
  metadata: {
    source: string
    reference_year: number
    currency: string
    unit: string
    note: string
    downloaded: string
    total_exports: number
    total_imports: number
    trade_balance: number
  }
  partners: TradePartner[]
  sectors: {
    exports: SectorEntry[]
    imports: SectorEntry[]
  }
  timeseries: {
    annual: AnnualTotal[]
    monthly_2025_2026: MonthlyTotal[]
  }
}

export async function fetchTradeData(): Promise<TradeData> {
  const res = await fetch('/trade/trade_2024.json')
  if (!res.ok) throw new Error('Failed to load trade data')
  return res.json()
}

export const FTA_LABELS: Record<FtaStatus, string> = {
  EU_bilateral:          'EU Bilateral',
  in_force:              'FTA in force',
  framework_agreed:      'Framework agreed',
  under_negotiation:     'Under negotiation',
  signed_not_in_force:   'Signed, pending',
  none:                  'No FTA',
}

export const FTA_COLORS: Record<FtaStatus, string> = {
  EU_bilateral:          '#3b82f6',  // blue
  in_force:              '#16a34a',  // green
  framework_agreed:      '#f59e0b',  // amber
  under_negotiation:     '#f59e0b',  // amber
  signed_not_in_force:   '#f59e0b',  // amber
  none:                  '#94a3b8',  // slate
}
