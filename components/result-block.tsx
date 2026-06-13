'use client'

import { Clock } from 'lucide-react'
import { useLanguage } from '@/contexts/language'
import { type Vorlage, type Resultat, staendeYes } from '@/lib/votation'

export function ResultBar({ pct }: { pct: number }) {
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${pct >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
        style={{ width: `${pct}%` }}
      />
      <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
    </div>
  )
}

export function ResultBlock({ result }: { result: Resultat }) {
  const { t } = useLanguage()
  const { jaStimmenInProzent: ja, stimmbeteiligungInProzent: turnout, gebietAusgezaehlt } = result

  if (ja === null) {
    return (
      <div className="rounded-md bg-muted/50 p-3">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {t.sidebar.pending}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        {gebietAusgezaehlt && (
          <span className="ml-auto text-xs text-green-600">{t.sidebar.final}</span>
        )}
      </div>
      <div className="flex items-baseline justify-between">
        <span className={`text-xl font-semibold tabular-nums ${ja >= 50 ? 'text-green-600' : 'text-red-500'}`}>
          {ja.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">{t.sidebar.yes}</span>
      </div>
      <ResultBar pct={ja} />
      {turnout !== null && (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t.sidebar.turnout}: {turnout.toFixed(1)}%
        </p>
      )}
    </div>
  )
}

export function StaendeBlock({ vorlage }: { vorlage: Vorlage }) {
  const { t } = useLanguage()
  if (!vorlage.doppeltesMehr) return null
  const { staende } = vorlage
  const yes = staendeYes(staende)
  const no = (staende.neinStaendeGanz ?? 0) + (staende.neinStaendeHalb ?? 0) * 0.5
  const pending = staende.anzahlStaendeGanz === null

  return (
    <div className="rounded-md bg-muted/50 p-3">
      <p className="mb-1.5 text-xs text-muted-foreground">{t.sidebar.cantonalVotes}</p>
      {pending ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> {t.sidebar.pending}
        </p>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-green-600">{yes} {t.sidebar.yes}</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-red-500">{no} {t.sidebar.no}</span>
          <span className="ml-auto text-xs text-muted-foreground">{t.sidebar.cantonalVotesOf}</span>
        </div>
      )}
    </div>
  )
}
