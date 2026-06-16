'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Menu } from 'lucide-react'
import { LanguageSwitcher } from './language-switcher'
import { useLanguage } from '@/contexts/language'
import { Button } from './ui/button'

interface AppHeaderProps {
  onToggleSidebar: () => void
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { t } = useLanguage()
  const pathname = usePathname()

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleSidebar}
        className="md:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <Map className="h-4 w-4 shrink-0 text-primary" />
      <span className="font-semibold tracking-tight">Swiss Maps</span>

      <nav className="ml-3 hidden gap-1 md:flex">
        <Link
          href="/"
          className={`rounded px-3 py-1 text-sm font-medium hover:bg-muted ${pathname === '/' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {t.nav.votations}
        </Link>
        <Link
          href="/demographics"
          className={`rounded px-3 py-1 text-sm font-medium hover:bg-muted ${pathname === '/demographics' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {t.nav.demographics}
        </Link>
        <Link
          href="/trade"
          className={`rounded px-3 py-1 text-sm font-medium hover:bg-muted ${pathname === '/trade' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {t.nav.trade}
        </Link>
        <Link
          href="/data"
          className={`rounded px-3 py-1 text-sm font-medium hover:bg-muted ${pathname === '/data' ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          {t.nav.data}
        </Link>
      </nav>

      <div className="ml-auto">
        <LanguageSwitcher />
      </div>
    </header>
  )
}
