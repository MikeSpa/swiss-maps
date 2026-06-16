import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement } from 'react'
import { LanguageProvider } from '@/contexts/language'

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: LanguageProvider, ...options })
}

export * from '@testing-library/react'
