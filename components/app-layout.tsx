'use client'

import { useState } from 'react'
import { AppHeader } from './app-header'
import { MapShell } from './map-shell'

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <MapShell
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
      />
    </div>
  )
}
