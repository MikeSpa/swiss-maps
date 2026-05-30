'use client'

import { useState } from 'react'
import { AppHeader } from './app-header'
import { DemographicsShell } from './demographics-shell'

export function DemographicsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <DemographicsShell
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
      />
    </div>
  )
}
