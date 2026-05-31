'use client'

import { useState } from 'react'
import { ExternalLink, ThumbsUp, ThumbsDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/contexts/language'
import type { ErlaeuterungenData, ErlaeuterungenProposal } from '@/lib/erlaeuterungen'
import { getInkuerze, pdfViewUrl } from '@/lib/erlaeuterungen'
import type { Vorlage } from '@/lib/votation'
import { getTitle } from '@/lib/votation'

interface Props {
  vorlage: Vorlage
  erlaeuterungen: ErlaeuterungenData | null
  open: boolean
  onClose: () => void
}

function GovRecBadge({ rec, label }: { rec: 'accept' | 'reject'; label: string }) {
  if (rec === 'accept') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 dark:bg-green-900/30 dark:text-green-300">
        <ThumbsUp className="h-3 w-3" />
        {label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-900/30 dark:text-red-300">
      <ThumbsDown className="h-3 w-3" />
      {label}
    </span>
  )
}

function PdfLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-primary underline underline-offset-2 hover:opacity-70"
    >
      <ExternalLink className="h-3 w-3" />
      {label}
    </a>
  )
}

export function VorlageInfoModal({ vorlage, erlaeuterungen, open, onClose }: Props) {
  const { lang, t } = useLanguage()
  const [expanded, setExpanded] = useState(false)

  const proposal: ErlaeuterungenProposal | undefined = erlaeuterungen?.proposals.find(
    (p) => p.vorlagenId === vorlage.vorlagenId,
  )

  const summaryText = proposal ? getInkuerze(proposal, lang) : ''
  const PREVIEW_LENGTH = 600
  const isLong = summaryText.length > PREVIEW_LENGTH
  const displayText = isLong && !expanded ? summaryText.slice(0, PREVIEW_LENGTH) + '…' : summaryText

  const pdfUrl = erlaeuterungen?.pdf_urls?.[lang as 'de' | 'fr' | 'it']
    ?? erlaeuterungen?.pdf_urls?.de

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t.erlaeuterungen.title}
          </p>
          <DialogTitle className="text-base font-semibold leading-snug">
            {getTitle(vorlage.vorlagenTitel, lang)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Government recommendation */}
          {proposal?.gov_rec && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.erlaeuterungen.govRec}
              </p>
              <GovRecBadge
                rec={proposal.gov_rec}
                label={
                  proposal.gov_rec === 'accept'
                    ? t.erlaeuterungen.govRecAccept
                    : t.erlaeuterungen.govRecReject
                }
              />
            </div>
          )}

          {/* Summary text */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t.erlaeuterungen.inkuerze}
            </p>
            {summaryText ? (
              <>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {displayText}
                </p>
                {isLong && (
                  <button
                    onClick={() => setExpanded((e) => !e)}
                    className="mt-2 text-xs text-primary underline underline-offset-2 hover:opacity-70"
                  >
                    {expanded ? '↑ Show less' : '↓ Show more'}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t.erlaeuterungen.noText}</p>
            )}
          </div>
        </div>

        {/* Footer with PDF links */}
        {pdfUrl && (
          <div className="shrink-0 border-t px-6 py-3">
            <div className="flex flex-wrap gap-4">
              {(['de', 'fr', 'it'] as const).map((l) => {
                const url = erlaeuterungen?.pdf_urls?.[l]
                if (!url) return null
                const labels: Record<string, string> = { de: 'DE', fr: 'FR', it: 'IT' }
                return (
                  <PdfLink
                    key={l}
                    href={pdfViewUrl(url)}
                    label={`${t.erlaeuterungen.openPdf} (${labels[l]})`}
                  />
                )
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
