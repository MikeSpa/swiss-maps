import { describe, it, expect } from 'vitest'
import { sectorMetrics } from './trade'
import type { TradePartner, SectorsData } from './trade'

const partner: TradePartner = {
  country: 'Germany',
  country_code: 'DE',
  exports: 1000,
  imports: 800,
  balance: 200,
  fta_status: 'EU_bilateral',
}

const byCountry: SectorsData['by_country'] = {
  DE: {
    exports: [{ sector: 'Pharma', sector_code: 'CHEM_PHARMA', share_pct: 25, value_CHF_millions: 250 }],
    imports: [{ sector: 'Pharma', sector_code: 'CHEM_PHARMA', share_pct: 10, value_CHF_millions: 80 }],
  },
}

describe('sectorMetrics', () => {
  it('computes exp/imp/balance/volume from sector shares', () => {
    const m = sectorMetrics(partner, byCountry, 'CHEM_PHARMA')
    expect(m.expShare).toBe(25)
    expect(m.impShare).toBe(10)
    expect(m.exp).toBe(250) // 25% of 1000
    expect(m.imp).toBe(80) // 10% of 800
    expect(m.balance).toBe(170)
    expect(m.volume).toBe(330)
  })

  it('defaults to zero shares when the sector is not in the country data', () => {
    const m = sectorMetrics(partner, byCountry, 'WATCHES')
    expect(m).toEqual({ exp: 0, imp: 0, balance: 0, expShare: 0, impShare: 0, volume: 0 })
  })

  it('defaults to zero shares when the country has no sector data at all', () => {
    const m = sectorMetrics(partner, {}, 'CHEM_PHARMA')
    expect(m).toEqual({ exp: 0, imp: 0, balance: 0, expShare: 0, impShare: 0, volume: 0 })
  })
})
