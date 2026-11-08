'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Menu, PanelLeft } from 'lucide-react'
import { LanguageSwitcher } from './language-switcher'
import { useLanguage } from '@/contexts/language'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

interface AppHeaderProps {
  onToggleSidebar: () => void
}

export function AppHeader({ onToggleSidebar }: AppHeaderProps) {
  const { t } = useLanguage()
  const pathname = usePathname()

  const pages = [
    { href: '/', label: t.nav.votations },
    { href: '/demographics', label: t.nav.demographics },
    { href: '/trade', label: t.nav.trade },
    { href: '/data', label: t.nav.data },
  ]

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3">
      {/* Mobile: page navigation */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label={t.nav.menu}>
            <Menu className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          {pages.map((page) => (
            <DropdownMenuItem key={page.href} asChild>
              <Link
                href={page.href}
                aria-current={pathname === page.href ? 'page' : undefined}
                className={pathname === page.href ? 'font-semibold' : 'text-muted-foreground'}
              >
                {page.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile: open the page's sidebar */}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onToggleSidebar}
        className="md:hidden"
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="h-4 w-4" />
      </Button>

      <Map className="hidden h-4 w-4 shrink-0 text-primary sm:block" />
      <span className="whitespace-nowrap font-semibold tracking-tight">Swiss Maps</span>

      <nav className="ml-3 hidden gap-1 md:flex">
        {pages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className={`rounded px-3 py-1 text-sm font-medium hover:bg-muted ${pathname === page.href ? 'text-foreground' : 'text-muted-foreground'}`}
          >
            {page.label}
          </Link>
        ))}
      </nav>

      <div className="ml-auto">
        <LanguageSwitcher />
      </div>
    </header>
  )
}
