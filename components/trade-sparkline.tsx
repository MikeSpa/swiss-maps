import type { AnnualTotal } from '@/lib/trade'

export function TradeSparkline({ annual }: { annual: AnnualTotal[] }) {
  const data = annual.filter(a => !a.preliminary)
  if (data.length < 2) return null

  const W = 240
  const H = 44
  const PAD = { l: 0, r: 0, t: 4, b: 14 }
  const innerW = W - PAD.l - PAD.r
  const innerH = H - PAD.t - PAD.b

  const allVals = data.flatMap(a => [a.exports, a.imports])
  const minV = Math.min(...allVals) * 0.92
  const maxV = Math.max(...allVals) * 1.02

  const xOf = (i: number) => PAD.l + (i / (data.length - 1)) * innerW
  const yOf = (v: number) => PAD.t + (1 - (v - minV) / (maxV - minV)) * innerH

  const expLine = data.map((a, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(a.exports).toFixed(1)}`).join(' ')
  const impLine = data.map((a, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(a.imports).toFixed(1)}`).join(' ')

  // Balance area (shaded between exports and imports at each point)
  const balAreaTop = data.map((a, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(a.exports).toFixed(1)}`).join(' ')
  const balAreaBot = data.map((a, i) => `L${xOf(i).toFixed(1)},${yOf(a.imports).toFixed(1)}`).reverse().join(' ')
  const balArea = `${balAreaTop} ${balAreaBot} Z`

  const firstYear = data[0].year
  const lastYear = data[data.length - 1].year

  return (
    <svg width={W} height={H} className="overflow-visible">
      {/* Balance fill between the two lines */}
      <path d={balArea} fill="#3b82f6" fillOpacity={0.08} />
      {/* Import line */}
      <path d={impLine} fill="none" stroke="#dc2626" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Export line */}
      <path d={expLine} fill="none" stroke="#16a34a" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* Year labels */}
      <text x={PAD.l} y={H} fontSize={9} fill="currentColor" className="text-muted-foreground" opacity={0.5}>{firstYear}</text>
      <text x={W - PAD.r} y={H} fontSize={9} fill="currentColor" className="text-muted-foreground" opacity={0.5} textAnchor="end">{lastYear}</text>
    </svg>
  )
}
