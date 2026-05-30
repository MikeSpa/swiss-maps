'use client'

import { useEffect, useState } from 'react'
import { DemographicsSidebar } from './demographics-sidebar'
import { DemographicsMapLoader } from './demographics-map-loader'
import { fetchDemographics, type DemographicData, type DemographicTopic } from '@/lib/demographics'

interface DemographicsShellProps {
  sidebarOpen: boolean
  onCloseSidebar: () => void
}

export function DemographicsShell({ sidebarOpen, onCloseSidebar }: DemographicsShellProps) {
  const [data, setData] = useState<DemographicData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)

  useEffect(() => {
    fetchDemographics()
      .then((d) => {
        setData(d)
        if (d.topics.length > 0) setSelectedTopicId(d.topics[0].id)
      })
      .catch(() => setLoadError('Could not load demographic data.'))
  }, [])

  const selectedTopic: DemographicTopic | null =
    data?.topics.find((tp) => tp.id === selectedTopicId) ?? null

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <DemographicsSidebar
        isOpen={sidebarOpen}
        onClose={onCloseSidebar}
        data={data}
        loadError={loadError}
        selectedTopicId={selectedTopicId}
        onSelectTopic={setSelectedTopicId}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
          onClick={onCloseSidebar}
        />
      )}

      <main className="flex min-h-0 flex-1 flex-col">
        <DemographicsMapLoader
          communes={data?.communes ?? null}
          topic={selectedTopic}
        />
      </main>
    </div>
  )
}
