import { CheckCircle, XCircle, Clock, ChevronRight, AlertCircle } from 'lucide-react'
import {
  type VotationData,
  type Vorlage,
  type Resultat,
  getTitle,
  VORLAGE_ART,
  staendeYes,
} from '@/lib/votation'

interface VotationEntry {
  date: string
  label: string
  file: string
}

interface Selection {
  cantonNum: number
  cantonName: string
}

interface AppSidebarProps {
  index: VotationEntry[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
  votation: VotationData | null
  loadError: string | null
  selectedVorlageId: number | null
  onSelectVorlage: (id: number) => void
  selection: Selection | null
  cantonResult: Resultat | null
}

function ResultBar({ pct }: { pct: number }) {
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

function ResultBlock({ label, result }: { label?: string; result: Resultat }) {
  const { jaStimmenInProzent: ja, stimmbeteiligungInProzent: turnout, gebietAusgezaehlt } = result

  if (ja === null) {
    return (
      <div className="rounded-md bg-muted/50 p-3">
        {label && <p className="mb-1 text-xs text-muted-foreground">{label}</p>}
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> Pending
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-md bg-muted/50 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        {label && <p className="text-xs text-muted-foreground">{label}</p>}
        {gebietAusgezaehlt && (
          <span className="ml-auto text-xs text-green-600">Final</span>
        )}
      </div>
      <div className="flex items-baseline justify-between">
        <span className={`text-xl font-semibold tabular-nums ${ja >= 50 ? 'text-green-600' : 'text-red-500'}`}>
          {ja.toFixed(1)}%
        </span>
        <span className="text-xs text-muted-foreground">Yes</span>
      </div>
      <ResultBar pct={ja} />
      {turnout !== null && (
        <p className="mt-1.5 text-xs text-muted-foreground">Turnout: {turnout.toFixed(1)}%</p>
      )}
    </div>
  )
}

function StaendeBlock({ vorlage }: { vorlage: Vorlage }) {
  if (!vorlage.doppeltesMehr) return null
  const { staende } = vorlage
  const yes = staendeYes(staende)
  const no = (staende.neinStaendeGanz ?? 0) + (staende.neinStaendeHalb ?? 0) * 0.5
  const pending = staende.anzahlStaendeGanz === null

  return (
    <div className="rounded-md bg-muted/50 p-3">
      <p className="mb-1.5 text-xs text-muted-foreground">Cantonal votes (Ständemehr)</p>
      {pending ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" /> Pending
        </p>
      ) : (
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-green-600">{yes} Yes</span>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-red-500">{no} No</span>
          <span className="ml-auto text-xs text-muted-foreground">of 23</span>
        </div>
      )}
    </div>
  )
}

export function AppSidebar({
  index,
  selectedDate,
  onSelectDate,
  votation,
  loadError,
  selectedVorlageId,
  onSelectVorlage,
  selection,
  cantonResult,
}: AppSidebarProps) {
  const selectedVorlage = votation?.vorlagen.find((v) => v.vorlagenId === selectedVorlageId)

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-background p-4">
      {/* Date selector */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Vote date
        </p>
        <div className="flex flex-wrap gap-1.5">
          {index.map((entry) => (
            <button
              key={entry.date}
              onClick={() => onSelectDate(entry.date)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                selectedDate === entry.date
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      <hr className="border-border" />

      {loadError ? (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {loadError}
        </div>
      ) : !votation ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <>
          {/* Proposals */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Proposals
            </p>
            {votation.vorlagen.map((v) => {
              const active = v.vorlagenId === selectedVorlageId
              return (
                <button
                  key={v.vorlagenId}
                  onClick={() => onSelectVorlage(v.vorlagenId)}
                  className={`rounded-md border p-2.5 text-left text-xs transition-colors ${
                    active
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 shrink-0">
                      {v.vorlageAngenommen === true ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                      ) : v.vorlageAngenommen === false ? (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium leading-snug text-foreground">
                        {getTitle(v.vorlagenTitel)}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">{VORLAGE_ART[v.vorlagenArtId]}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* National result */}
          {selectedVorlage && (
            <>
              <hr className="border-border" />
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  National result
                </p>
                <ResultBlock result={selectedVorlage.resultat} />
                <StaendeBlock vorlage={selectedVorlage} />
              </div>
            </>
          )}

          {/* Canton result */}
          {selectedVorlage && selection && (
            <>
              <hr className="border-border" />
              <div className="flex flex-col gap-2">
                <p className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Canton <ChevronRight className="h-3 w-3" /> {selection.cantonName}
                </p>
                {cantonResult ? (
                  <ResultBlock result={cantonResult} />
                ) : (
                  <p className="text-xs text-muted-foreground">No data</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </aside>
  )
}
