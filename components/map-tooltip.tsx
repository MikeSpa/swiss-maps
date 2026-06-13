import type { ReactNode } from 'react'

interface MapTooltipProps {
  x: number
  y: number
  children: ReactNode
}

/** Small popover anchored to a map hover position (cantons/districts/municipalities + demographics). */
export function MapTooltip({ x, y, children }: MapTooltipProps) {
  return (
    <div
      className="pointer-events-none absolute z-10 min-w-36 rounded bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
      style={{ left: x + 12, top: y - 40 }}
    >
      {children}
    </div>
  )
}
