'use client'

import { useEffect, useState } from 'react'
import { AppSidebar } from './app-sidebar'
import { MapLoader } from './map-loader'
import {
  type VotationData,
  type Resultat,
  fetchVotation,
  buildCantonResultMap,
  buildDistrictResultMap,
  buildMunicipalityResultMap,
} from '@/lib/votation'
import { fetchDemographics, type DemographicData } from '@/lib/demographics'

interface VotationEntry {
  date: string
  label: string
  file: string
}

interface MapShellProps {
  sidebarOpen: boolean
  onCloseSidebar: () => void
}

interface Selection {
  cantonNum: number
  cantonName: string
}

export function MapShell({ sidebarOpen, onCloseSidebar }: MapShellProps) {
  const [index, setIndex] = useState<VotationEntry[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [votation, setVotation] = useState<VotationData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedVorlageId, setSelectedVorlageId] = useState<number | null>(null)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [demoData, setDemoData] = useState<DemographicData | null>(null)

  // Load demographics in background (non-blocking)
  useEffect(() => {
    fetchDemographics().then(setDemoData).catch(() => {})
  }, [])

  // Load index
  useEffect(() => {
    fetch('/votations/index.json')
      .then((r) => r.json())
      .then((entries: VotationEntry[]) => {
        setIndex(entries)
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
        const defaultEntry = entries.find((e) => e.date <= today) ?? entries[entries.length - 1]
        if (defaultEntry) setSelectedDate(defaultEntry.date)
      })
      .catch(() => setLoadError('Could not load votation index.'))
  }, [])

  // Load votation data when date changes
  useEffect(() => {
    if (!selectedDate) return
    const entry = index.find((e) => e.date === selectedDate)
    if (!entry) return

    setVotation(null)
    setSelectedVorlageId(null)
    setLoadError(null)

    fetchVotation(entry.file)
      .then((data) => {
        setVotation(data)
        if (data.vorlagen.length > 0) setSelectedVorlageId(data.vorlagen[0].vorlagenId)
      })
      .catch(() => setLoadError('Could not load votation data.'))
  }, [selectedDate, index])

  const selectedVorlage = votation?.vorlagen.find((v) => v.vorlagenId === selectedVorlageId)
  const cantonResults: Record<number, Resultat> | null = selectedVorlage
    ? buildCantonResultMap(selectedVorlage)
    : null
  const districtResults: Record<number, Resultat> | null =
    selectedVorlage && selection
      ? buildDistrictResultMap(selectedVorlage, selection.cantonNum)
      : null
  const municipalityResults: Record<number, Resultat> | null =
    selectedVorlage && selection
      ? buildMunicipalityResultMap(selectedVorlage, selection.cantonNum)
      : null
  const cantonResult: Resultat | null =
    selection && cantonResults ? (cantonResults[selection.cantonNum] ?? null) : null

  return (
    <div className="relative flex flex-1 overflow-hidden">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={onCloseSidebar}
        />
      )}

      <AppSidebar
        isOpen={sidebarOpen}
        onClose={onCloseSidebar}
        index={index}
        selectedDate={selectedDate}
        onSelectDate={(date) => { setSelectedDate(date); setSelection(null) }}
        votation={votation}
        loadError={loadError}
        selectedVorlageId={selectedVorlageId}
        onSelectVorlage={setSelectedVorlageId}
        selection={selection}
        cantonResult={cantonResult}
        cantonResults={cantonResults}
        municipalityResults={municipalityResults}
        demoData={demoData}
      />
      <main className="relative flex-1 overflow-hidden">
        <MapLoader
          selectedCantonNum={selection?.cantonNum ?? null}
          cantonResults={cantonResults}
          districtResults={districtResults}
          municipalityResults={municipalityResults}
          onSelect={(cantonNum, cantonName) => setSelection({ cantonNum, cantonName })}
          onReset={() => setSelection(null)}
        />
      </main>
    </div>
  )
}
