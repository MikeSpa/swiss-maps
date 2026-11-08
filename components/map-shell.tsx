'use client'

import { useEffect, useRef, useState } from 'react'
import { AppSidebar } from './app-sidebar'
import { MapLoader } from './map-loader'
import {
  type VotationData,
  type VotationEntry,
  type Resultat,
  fetchVotation,
  buildCantonResultMap,
  buildDistrictResultMap,
  buildMunicipalityResultMap,
  isUpcoming,
} from '@/lib/votation'
import { parseUrlState, buildUrlSearch, type UrlState } from '@/lib/url-state'
import { fetchDemographics, type DemographicData } from '@/lib/demographics'
import { fetchErlaeuterungen, type ErlaeuterungenData } from '@/lib/erlaeuterungen'

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
  const [erlaeuterungen, setErlaeuterungen] = useState<ErlaeuterungenData | null>(null)
  const [loadedDate, setLoadedDate] = useState<string | null>(null)
  // State requested by the URL on first load (consumed once)
  const initialUrlState = useRef<UrlState | null>(null)
  // Only write to the URL after a user interaction: rewriting history on the automatic
  // initial load can race with (and cancel) an in-flight navigation to another page.
  const urlSyncReady = useRef(false)

  // Reset previous votation data as soon as the selected date changes, before the
  // new data has loaded (adjusting state during render avoids an extra cascading effect).
  if (selectedDate !== loadedDate) {
    setLoadedDate(selectedDate)
    setVotation(null)
    setSelectedVorlageId(null)
    setLoadError(null)
    setErlaeuterungen(null)
  }

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
        // Index is sorted newest-first: default to the latest votation that already has results
        const defaultEntry = entries.find((e) => !isUpcoming(e.date)) ?? entries[entries.length - 1]
        const fromUrl = parseUrlState(window.location.search)
        const urlEntry = entries.find((e) => e.date === fromUrl.date && !isUpcoming(e.date))
        const entry = urlEntry ?? defaultEntry
        initialUrlState.current = urlEntry ? fromUrl : null
        if (entry) setSelectedDate(entry.date)
        // Canton name is filled in by the map once the geometry is loaded
        if (urlEntry && fromUrl.cantonNum !== null) {
          setSelection({ cantonNum: fromUrl.cantonNum, cantonName: '' })
        }
      })
      .catch(() => setLoadError('Could not load votation index.'))
  }, [])

  // Load votation data when date changes
  useEffect(() => {
    if (!selectedDate) return
    const entry = index.find((e) => e.date === selectedDate)
    if (!entry) return

    fetchVotation(entry.file)
      .then((data) => {
        setVotation(data)
        const wanted = initialUrlState.current?.vorlageId
        initialUrlState.current = null
        const initial = data.vorlagen.find((v) => v.vorlagenId === wanted) ?? data.vorlagen[0]
        if (initial) setSelectedVorlageId(initial.vorlagenId)
      })
      .catch(() => setLoadError('Could not load votation data.'))

    fetchErlaeuterungen(selectedDate).then(setErlaeuterungen)
  }, [selectedDate, index])

  // Keep the URL in sync so the current view can be shared
  useEffect(() => {
    if (!urlSyncReady.current || !selectedDate || selectedVorlageId === null) return
    const search = buildUrlSearch({
      date: selectedDate,
      vorlageId: selectedVorlageId,
      cantonNum: selection?.cantonNum ?? null,
    })
    if (search !== window.location.search) {
      window.history.replaceState(null, '', `${window.location.pathname}${search}`)
    }
  }, [selectedDate, selectedVorlageId, selection])

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
        onSelectDate={(date) => {
          urlSyncReady.current = true
          setSelectedDate(date)
          setSelection(null)
        }}
        votation={votation}
        loadError={loadError}
        selectedVorlageId={selectedVorlageId}
        onSelectVorlage={(id) => {
          urlSyncReady.current = true
          setSelectedVorlageId(id)
        }}
        selection={selection}
        cantonResult={cantonResult}
        cantonResults={cantonResults}
        municipalityResults={municipalityResults}
        demoData={demoData}
        erlaeuterungen={erlaeuterungen}
      />
      <main className="relative flex-1 overflow-hidden">
        <MapLoader
          selectedCantonNum={selection?.cantonNum ?? null}
          cantonResults={cantonResults}
          districtResults={districtResults}
          municipalityResults={municipalityResults}
          onSelect={(cantonNum, cantonName) => {
            // Resolving the name of a canton restored from the URL is not a user interaction
            if (selection?.cantonNum !== cantonNum) urlSyncReady.current = true
            setSelection({ cantonNum, cantonName })
          }}
          onReset={() => {
            urlSyncReady.current = true
            setSelection(null)
          }}
        />
      </main>
    </div>
  )
}
