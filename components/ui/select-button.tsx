import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean
  /** Classes applied only when inactive (background/hover treatment) */
  inactiveClassName?: string
}

/** Pill-style toggle button for date/language/filter selectors. */
export function SelectButton({ active, inactiveClassName, className, ...props }: SelectButtonProps) {
  return (
    <button
      className={cn(
        'rounded transition-colors',
        className,
        active ? 'bg-primary text-primary-foreground' : inactiveClassName,
      )}
      {...props}
    />
  )
}
