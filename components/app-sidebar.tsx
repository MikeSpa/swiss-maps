'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, Clock, ChevronRight, AlertCircle, Info } from 'lucide-react'
import { useLanguage } from '@/contexts/language'
import { type VotationData, type VotationEntry, type Vorlage, type Resultat, getTitle } from '@/lib/votation'
import type { DemographicData } from '@/lib/demographics'
import type { ErlaeuterungenData } from '@/lib/erlaeuterungen'
import { VotationScatter } from './votation-scatter'
import { VorlageInfoModal } from './vorlage-info-modal'
import { ResultBlock, StaendeBlock } from './result-block'
import { SelectButton } from './ui/select-button'

interface Selection {
  cantonNum: number
  cantonName: string
}

interface AppSidebarProps {
  isOpen: boolean
  onClose: () => void
  index: VotationEntry[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
  votation: VotationData | null
  loadError: string | null
  selectedVorlageId: number | null
  onSelectVorlage: (id: number) => void
  selection: Selection | null
  cantonResult: Resultat | null
  cantonResults: Record<number, Resultat> | null
  municipalityResults: Record<number, Resultat> | null
  demoData: DemographicData | null
  erlaeuterungen: ErlaeuterungenData | null
}

export function AppSidebar({
  isOpen,
  onClose,
  index,
  selectedDate,
  onSelectDate,
  votation,
  loadError,
  selectedVorlageId,
  onSelectVorlage,
  selection,
  cantonResult,
  cantonResults,
  municipalityResults,
  demoData,
  erlaeuterungen,
}: AppSidebarProps) {
  const { lang, t } = useLanguage()
  const [infoVorlage, setInfoVorlage] = useState<Vorlage | null>(null)
  const selectedVorlage = votation?.vorlagen.find((v) => v.vorlagenId === selectedVorlageId)

  return (
    <aside className={[
      // Desktop: always visible inline
      'md:relative md:flex md:w-72 md:shrink-0 md:translate-x-0',
      // Mobile: fixed overlay that slides in
      'fixed bottom-0 top-12 z-50 w-72',
      'transition-transform duration-200 ease-in-out',
      isOpen ? 'translate-x-0' : '-translate-x-full',
      'flex flex-col gap-4 overflow-y-auto border-r bg-background p-4',
    ].join(' ')}>
      {/* Date selector */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t.sidebar.voteDate}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {index.map((entry) => (
            <SelectButton
              key={entry.date}
              active={selectedDate === entry.date}
              onClick={() => { onSelectDate(entry.date); onClose() }}
              className="px-2.5 py-1 text-xs font-medium"
              inactiveClassName="bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            >
              {entry.label}
            </SelectButton>
          ))}
        </div>
      </div>

      <hr className="border-border" />

      {loadError ? (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {t.sidebar.error}
        </div>
      ) : !votation ? (
        <p className="text-xs text-muted-foreground">{t.sidebar.loading}</p>
      ) : (
        <>
          {/* Proposals */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t.sidebar.proposals}
            </p>
            {votation.vorlagen.map((v) => {
              const active = v.vorlagenId === selectedVorlageId
              const hasErlaeuterungen = erlaeuterungen?.proposals.some(
                (p) => p.vorlagenId === v.vorlagenId,
              )
              return (
                <div key={v.vorlagenId} className="relative">
                  <button
                    onClick={() => { onSelectVorlage(v.vorlagenId); onClose() }}
                    className={`w-full rounded-md border p-2.5 text-left text-xs transition-colors ${
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/40 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex items-start gap-2 pr-6">
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
                          {getTitle(v.vorlagenTitel, lang)}
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                          {t.vorlageArt[v.vorlagenArtId]}
                        </p>
                      </div>
                    </div>
                  </button>
                  {hasErlaeuterungen && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setInfoVorlage(v) }}
                      className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                      title={t.erlaeuterungen.title}
                    >
                      <Info className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* National result */}
          {selectedVorlage && (
            <>
              <hr className="border-border" />
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t.sidebar.nationalResult}
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
                  {t.sidebar.canton} <ChevronRight className="h-3 w-3" /> {selection.cantonName}
                </p>
                {cantonResult ? (
                  <ResultBlock result={cantonResult} />
                ) : (
                  <p className="text-xs text-muted-foreground">{t.sidebar.noData}</p>
                )}
              </div>
            </>
          )}

          {/* Correlation scatter */}
          {selectedVorlage && demoData && (
            <>
              <hr className="border-border" />
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t.sidebar.correlation}
                </p>
                <VotationScatter
                  demoData={demoData}
                  cantonResults={cantonResults}
                  municipalityResults={municipalityResults}
                  isMunicipalityLevel={selection !== null && municipalityResults !== null}
                />
              </div>
            </>
          )}
        </>
      )}

      {infoVorlage && (
        <VorlageInfoModal
          vorlage={infoVorlage}
          erlaeuterungen={erlaeuterungen}
          open={infoVorlage !== null}
          onClose={() => setInfoVorlage(null)}
        />
      )}
    </aside>
  )
}
