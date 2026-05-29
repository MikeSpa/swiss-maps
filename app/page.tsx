import { AppHeader } from '@/components/app-header'
import { MapShell } from '@/components/map-shell'

export default function Page() {
  return (
    <div className="flex h-svh flex-col">
      <AppHeader />
      <MapShell />
    </div>
  )
}
