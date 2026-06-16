import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from './ui/badge'

export const TAG_COLORS = {
  green: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  red:   'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  blue:  'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
} as const

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  )
}

export function Tag({ color, children }: { color: keyof typeof TAG_COLORS; children: ReactNode }) {
  return <Badge className={cn('rounded border-transparent', TAG_COLORS[color])}>{children}</Badge>
}

export function LimitationList({ items }: { items: string[] }) {
  return (
    <ul className="mt-1 space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className="mt-0.5 shrink-0 text-amber-500">⚠</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-800 dark:bg-blue-950/30">
      {children}
    </div>
  )
}
