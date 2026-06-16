import { jsonFetch } from './fetch'

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

export interface CountrySectors {
  exports: SectorEntry[]
  imports: SectorEntry[]
}

export interface SectorsData {
  metadata: { source: string; year: number; note: string }
  by_country: Record<string, CountrySectors>
}

export async function fetchSectorsData(): Promise<SectorsData> {
  return jsonFetch('/trade/sectors_by_country.json', 'Failed to load sectors data')
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
  return jsonFetch('/trade/trade_2024.json', 'Failed to load trade data')
}

export const FTA_LABELS: Record<FtaStatus, string> = {
  EU_bilateral:          'EU Bilateral',
  in_force:              'FTA in force',
  framework_agreed:      'Framework agreed',
  under_negotiation:     'Under negotiation',
  signed_not_in_force:   'Signed, pending',
  none:                  'No FTA',
}

/** Sector-specific export + import + balance for one partner, estimated from
 *  2025 sector shares applied to 2024 bilateral totals. */
export interface SectorMetrics {
  exp: number      // estimated sector exports (CHF millions)
  imp: number      // estimated sector imports (CHF millions)
  balance: number  // exp − imp
  expShare: number // % of that country's total exports that are this sector
  impShare: number // % of that country's total imports that are this sector
  volume: number   // exp + imp
}

export function sectorMetrics(
  partner: TradePartner,
  byCountry: SectorsData['by_country'],
  sectorCode: string,
): SectorMetrics {
  const cs = byCountry[partner.country_code]
  const expShare = cs?.exports.find(s => s.sector_code === sectorCode)?.share_pct ?? 0
  const impShare = cs?.imports.find(s => s.sector_code === sectorCode)?.share_pct ?? 0
  const exp = (expShare / 100) * partner.exports
  const imp = (impShare / 100) * partner.imports
  return { exp, imp, balance: exp - imp, expShare, impShare, volume: exp + imp }
}

export const FTA_COLORS: Record<FtaStatus, string> = {
  EU_bilateral:          '#3b82f6',  // blue
  in_force:              '#16a34a',  // green
  framework_agreed:      '#f59e0b',  // amber
  under_negotiation:     '#f59e0b',  // amber
  signed_not_in_force:   '#f59e0b',  // amber
  none:                  '#94a3b8',  // slate
}

export const SECTORS = [
  { code: 'CHEM_PHARMA',   label: 'Pharma',    color: '#6366f1' },
  { code: 'MACHINES_ELEC', label: 'Machines',  color: '#0ea5e9' },
  { code: 'WATCHES',       label: 'Watches',   color: '#d97706' },
  { code: 'PRECISION',     label: 'Medtech',   color: '#10b981' },
  { code: 'METALS',        label: 'Metals',    color: '#78716c' },
  { code: 'VEHICLES',      label: 'Vehicles',  color: '#3b82f6' },
  { code: 'TEXTILES',      label: 'Textiles',  color: '#ec4899' },
  { code: 'AGRI',          label: 'Agri',      color: '#65a30d' },
  { code: 'ENERGY',        label: 'Energy',    color: '#f97316' },
  { code: 'OTHER',         label: 'Other',     color: '#94a3b8' },
]
