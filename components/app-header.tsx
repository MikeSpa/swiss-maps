import { Map } from 'lucide-react'

export function AppHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-4">
      <Map className="h-4 w-4 text-primary" />
      <span className="font-semibold tracking-tight">Swiss Maps</span>
      <nav className="ml-4 flex gap-1">
        <a
          href="/"
          className="rounded px-3 py-1 text-sm font-medium text-foreground hover:bg-muted"
        >
          Votations
        </a>
        <a
          href="#"
          className="rounded px-3 py-1 text-sm text-muted-foreground hover:bg-muted"
        >
          Statistics
        </a>
      </nav>
    </header>
  )
}
