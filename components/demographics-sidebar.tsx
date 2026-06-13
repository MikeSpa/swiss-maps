'use client'

import { X } from 'lucide-react'
import { useLanguage } from '@/contexts/language'
import type { DemographicData, DemographicGroup, DemographicTopic } from '@/lib/demographics'
import { Button } from './ui/button'

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

  const selectedTopic = data?.topics.find((tp) => tp.id === selectedTopicId)

  // Build grouped topic list
  const grouped: { group: DemographicGroup; topics: DemographicTopic[] }[] = []
  if (data) {
    for (const group of data.groups) {
      const topics = data.topics.filter((tp) => tp.group === group.id)
      if (topics.length > 0) grouped.push({ group, topics })
    }
  }

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-20 flex w-72 flex-col border-r bg-background pt-12 shadow-lg transition-transform duration-200
        md:relative md:inset-auto md:z-auto md:pt-0 md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      <div className="flex items-center justify-between border-b px-4 py-3 md:hidden">
        <span className="font-semibold">{t.demographics.title}</span>
        <Button variant="ghost" size="icon-xs" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto pb-3">
        {loadError && (
          <p className="m-4 rounded bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t.demographics.error}
          </p>
        )}
        {!data && !loadError && (
          <p className="m-4 text-sm text-muted-foreground">{t.demographics.loading}</p>
        )}

        {grouped.map(({ group, topics }) => (
          <div key={group.id} className="px-3 pt-4 first:pt-3">
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label[lang] ?? group.label['en']}
            </p>
            <ul className="space-y-0.5">
              {topics.map((tp) => (
                <TopicRow
                  key={tp.id}
                  topic={tp}
                  lang={lang}
                  active={tp.id === selectedTopicId}
                  onClick={() => onSelectTopic(tp.id)}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {selectedTopic && (
        <div className="border-t px-4 py-2.5">
          <p className="text-xs text-muted-foreground">
            {t.demographics.source}: {selectedTopic.source} ({selectedTopic.year})
          </p>
        </div>
      )}
    </aside>
  )
}

function TopicRow({
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
        className={`w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${
          active ? 'bg-primary/10 font-medium text-primary' : 'text-foreground'
        }`}
      >
        {label}
      </button>
    </li>
  )
}
