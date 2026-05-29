'use client'

import { Map, Menu } from 'lucide-react'
import { LanguageSwitcher } from './language-switcher'
import { useLanguage } from '@/contexts/language'

interface AppHeaderProps {
  onToggleSidebar: () => void
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { t } = useLanguage()
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
      {/* Mobile sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="rounded p-1.5 hover:bg-muted md:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-4 w-4" />
      </button>

      <Map className="h-4 w-4 shrink-0 text-primary" />
      <span className="font-semibold tracking-tight">Swiss Maps</span>

      <nav className="ml-3 hidden gap-1 md:flex">
        <a href="/" className="rounded px-3 py-1 text-sm font-medium text-foreground hover:bg-muted">
          {t.nav.votations}
        </a>
        <a href="#" className="rounded px-3 py-1 text-sm text-muted-foreground hover:bg-muted">
          {t.nav.statistics}
        </a>
      </nav>

      <div className="ml-auto">
        <LanguageSwitcher />
      </div>
    </header>
  )
}
