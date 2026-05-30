'use client'

import { X } from 'lucide-react'
import { useLanguage } from '@/contexts/language'
import type { DemographicData, DemographicTopic } from '@/lib/demographics'

interface DemographicsSidebarProps {
  isOpen: boolean
  onClose: () => void
  data: DemographicData | null
  loadError: string | null
  selectedTopicId: string | null
  onSelectTopic: (id: string) => void
}

export function DemographicsSidebar({
  isOpen,
  onClose,
  data,
  loadError,
  selectedTopicId,
  onSelectTopic,
}: DemographicsSidebarProps) {
  const { lang, t } = useLanguage()

  const selected = data?.topics.find((tp) => tp.id === selectedTopicId)

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r bg-background pt-12 shadow-lg transition-transform duration-200
        md:relative md:inset-auto md:z-auto md:pt-0 md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      {/* Mobile close button */}
      <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
        <span className="font-semibold">{t.demographics.title}</span>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadError && (
          <p className="m-4 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t.demographics.error}
          </p>
        )}

        {!data && !loadError && (
          <p className="m-4 text-sm text-muted-foreground">{t.demographics.loading}</p>
        )}

        {data && (
          <div className="p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t.demographics.topic}
            </p>
            <ul className="space-y-0.5">
              {data.topics.map((tp) => (
                <TopicButton
                  key={tp.id}
                  topic={tp}
                  lang={lang}
                  active={tp.id === selectedTopicId}
                  onClick={() => onSelectTopic(tp.id)}
                />
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Source attribution */}
      {data && selected && (
        <div className="border-t px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {t.demographics.source}: {selected.source} ({selected.year})
          </p>
        </div>
      )}
    </aside>
  )
}

function TopicButton({
  topic,
  lang,
  active,
  onClick,
}: {
  topic: DemographicTopic
  lang: string
  active: boolean
  onClick: () => void
}) {
  const label = topic.label[lang] ?? topic.label['en'] ?? topic.id

  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-muted ${
          active ? 'bg-primary/10 font-medium text-primary' : 'text-foreground'
        }`}
      >
        <span className="block">{label}</span>
        <span className="text-xs text-muted-foreground">
          {topic.domain[0].toFixed(1)}–{topic.domain[1].toFixed(1)} {topic.unit}
        </span>
      </button>
    </li>
  )
}
