'use client'

import { useMemo, useState } from 'react'
import { useLanguage } from '@/contexts/language'
import type { DemographicData } from '@/lib/demographics'
import type { Resultat } from '@/lib/votation'

interface Props {
  demoData: DemographicData
  cantonResults: Record<number, Resultat> | null
  municipalityResults: Record<number, Resultat> | null
  isMunicipalityLevel: boolean
}

// ── SVG layout ────────────────────────────────────────────────────────────────

const W = 240
const H = 160
const ML = 28   // left margin (y-axis labels)
const MB = 22   // bottom margin (x-axis label)
const MT = 4
const MR = 4
const PW = W - ML - MR
const PH = H - MB - MT

// ── Math helpers ──────────────────────────────────────────────────────────────

function pearsonR(pts: { x: number; y: number }[]): number | null {
  const n = pts.length
  if (n < 3) return null
  const mx = pts.reduce((s, p) => s + p.x, 0) / n
  const my = pts.reduce((s, p) => s + p.y, 0) / n
  const num = pts.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0)
  const dx = Math.sqrt(pts.reduce((s, p) => s + (p.x - mx) ** 2, 0))
  const dy = Math.sqrt(pts.reduce((s, p) => s + (p.y - my) ** 2, 0))
  return dx && dy ? num / (dx * dy) : null
}

function linearFit(pts: { x: number; y: number }[]): { m: number; b: number } | null {
  const n = pts.length
  if (n < 2) return null
  const sx = pts.reduce((s, p) => s + p.x, 0)
  const sy = pts.reduce((s, p) => s + p.y, 0)
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0)
  const sx2 = pts.reduce((s, p) => s + p.x ** 2, 0)
  const d = n * sx2 - sx * sx
  if (!d) return null
  const m = (n * sxy - sx * sy) / d
  const b = (sy - m * sx) / n
  return { m, b }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VotationScatter({ demoData, cantonResults, municipalityResults, isMunicipalityLevel }: Props) {
  const { lang, t } = useLanguage()
  const [topicId, setTopicId] = useState(demoData.topics[0]?.id ?? '')
  const [hovered, setHovered] = useState<{ x: number; y: number; name: string; xv: number; yv: number } | null>(null)

  const topic = demoData.topics.find((tp) => tp.id === topicId)

  // Build (x, y, name) points
  const points = useMemo(() => {
    if (!topic) return []
    const pts: { x: number; y: number; name: string }[] = []

    if (isMunicipalityLevel && municipalityResults) {
      for (const [bfsStr, row] of Object.entries(demoData.communes)) {
        const bfs = parseInt(bfsStr, 10)
        const result = municipalityResults[bfs]
        const xv = row[topicId]
        if (result?.jaStimmenInProzent != null && xv != null) {
          pts.push({ x: xv, y: result.jaStimmenInProzent, name: bfsStr })
        }
      }
    } else if (cantonResults) {
      for (const [kStr, row] of Object.entries(demoData.cantons)) {
        const k = parseInt(kStr, 10)
        const result = cantonResults[k]
        const xv = row[topicId]
        if (result?.jaStimmenInProzent != null && xv != null) {
          pts.push({ x: xv, y: result.jaStimmenInProzent, name: kStr })
        }
      }
    }
    return pts
  }, [topicId, topic, cantonResults, municipalityResults, isMunicipalityLevel, demoData])

  const xDomain = topic?.domain ?? [0, 100]
  const yDomain: [number, number] = [0, 100]

  const toSvg = (x: number, y: number) => ({
    cx: ML + ((x - xDomain[0]) / (xDomain[1] - xDomain[0])) * PW,
    cy: MT + PH - ((y - yDomain[0]) / (yDomain[1] - yDomain[0])) * PH,
  })

  const r = useMemo(() => pearsonR(points), [points])
  const fit = useMemo(() => linearFit(points), [points])

  const regLine = useMemo(() => {
    if (!fit) return null
    const x0 = xDomain[0]
    const x1 = xDomain[1]
    const p0 = toSvg(x0, Math.max(0, Math.min(100, fit.m * x0 + fit.b)))
    const p1 = toSvg(x1, Math.max(0, Math.min(100, fit.m * x1 + fit.b)))
    return { x1: p0.cx, y1: p0.cy, x2: p1.cx, y2: p1.cy }
  }, [fit, xDomain]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-2">
      {/* Topic picker */}
      <select
        value={topicId}
        onChange={(e) => setTopicId(e.target.value)}
        aria-label={t.sidebar.correlationTopic}
        className="w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground"
      >
        {demoData.groups.map((g) => {
          const groupTopics = demoData.topics.filter((tp) => tp.group === g.id)
          if (!groupTopics.length) return null
          return (
            <optgroup key={g.id} label={g.label[lang] ?? g.label['en']}>
              {groupTopics.map((tp) => (
                <option key={tp.id} value={tp.id}>
                  {tp.label[lang] ?? tp.label['en']}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>

      {points.length < 3 ? (
        <p className="text-xs text-muted-foreground">Not enough data</p>
      ) : (
        <>
          <svg
            width={W}
            height={H}
            className="overflow-visible"
            onMouseLeave={() => setHovered(null)}
          >
            {/* Y gridlines at 25, 50, 75 */}
            {[25, 50, 75].map((yv) => {
              const { cy } = toSvg(xDomain[0], yv)
              return (
                <line key={yv} x1={ML} x2={ML + PW} y1={cy} y2={cy}
                  stroke="#e2e8f0" strokeWidth={0.8} />
              )
            })}

            {/* 50% reference */}
            {(() => { const { cy } = toSvg(xDomain[0], 50); return (
              <line x1={ML} x2={ML + PW} y1={cy} y2={cy}
                stroke="#94a3b8" strokeWidth={1} strokeDasharray="3,2" />
            ) })()}

            {/* Regression line */}
            {regLine && (
              <line {...regLine} stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4,2" opacity={0.8} />
            )}

            {/* Dots */}
            {points.map((p, i) => {
              const { cx, cy } = toSvg(p.x, p.y)
              return (
                <circle
                  key={i}
                  cx={cx} cy={cy} r={isMunicipalityLevel ? 2.5 : 5}
                  fill={p.y >= 50 ? '#16a34a' : '#dc2626'}
                  fillOpacity={isMunicipalityLevel ? 0.5 : 0.75}
                  stroke="white" strokeWidth={isMunicipalityLevel ? 0 : 0.8}
                  className="cursor-default"
                  onMouseEnter={() =>
                    setHovered({ x: cx, y: cy, name: p.name, xv: p.x, yv: p.y })
                  }
                />
              )
            })}

            {/* Y axis labels */}
            {[0, 50, 100].map((yv) => {
              const { cy } = toSvg(xDomain[0], yv)
              return (
                <text key={yv} x={ML - 3} y={cy + 3.5} textAnchor="end"
                  fontSize={8} fill="#94a3b8">{yv}%</text>
              )
            })}

            {/* X axis labels */}
            <text x={ML} y={H - 5} textAnchor="start" fontSize={8} fill="#94a3b8">
              {xDomain[0].toFixed(0)}
            </text>
            <text x={ML + PW} y={H - 5} textAnchor="end" fontSize={8} fill="#94a3b8">
              {xDomain[1].toFixed(0)}{topic?.unit ? ` ${topic.unit}` : ''}
            </text>

            {/* Hover tooltip inside SVG */}
            {hovered && (
              <g>
                <rect
                  x={Math.min(hovered.x + 6, W - 80)}
                  y={hovered.y - 26}
                  width={72} height={22}
                  rx={3}
                  fill="white" stroke="#e2e8f0" strokeWidth={1}
                />
                <text x={Math.min(hovered.x + 10, W - 76)} y={hovered.y - 15}
                  fontSize={8} fill="#1e293b" fontWeight="600">
                  {hovered.xv.toFixed(1)}{topic?.unit ? ` ${topic.unit}` : ''}
                </text>
                <text x={Math.min(hovered.x + 10, W - 76)} y={hovered.y - 6}
                  fontSize={8} fill={hovered.yv >= 50 ? '#16a34a' : '#dc2626'}>
                  {hovered.yv.toFixed(1)}% yes
                </text>
              </g>
            )}
          </svg>

          {/* Correlation summary */}
          {r !== null && (
            <p className="text-xs text-muted-foreground">
              r = <span className={`font-medium ${Math.abs(r) > 0.5 ? 'text-foreground' : ''}`}>
                {r.toFixed(2)}
              </span>
              {' '}·{' '}
              {Math.abs(r) < 0.2 ? 'no correlation' :
               Math.abs(r) < 0.4 ? (r > 0 ? 'weak positive' : 'weak negative') :
               Math.abs(r) < 0.6 ? (r > 0 ? 'moderate positive' : 'moderate negative') :
               (r > 0 ? 'strong positive' : 'strong negative')}
              {' '}· n={points.length}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {isMunicipalityLevel ? t.sidebar.correlationHintMuni : t.sidebar.correlationHint}
          </p>
        </>
      )}
    </div>
  )
}
