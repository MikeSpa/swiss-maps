import { describe, it, expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, screen } from '@/test/test-utils'
import { LanguageSwitcher } from './language-switcher'
import { LANGS } from '@/lib/i18n'

describe('LanguageSwitcher', () => {
  it('renders one button per supported language', () => {
    renderWithProviders(<LanguageSwitcher />)
    for (const { label } of LANGS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('defaults to English as the active language', () => {
    renderWithProviders(<LanguageSwitcher />)
    expect(screen.getByRole('button', { name: 'EN' })).toHaveClass('bg-primary')
    expect(screen.getByRole('button', { name: 'DE' })).not.toHaveClass('bg-primary')
  })

  it('marks a language as active once clicked', async () => {
    renderWithProviders(<LanguageSwitcher />)
    await userEvent.click(screen.getByRole('button', { name: 'DE' }))
    expect(screen.getByRole('button', { name: 'DE' })).toHaveClass('bg-primary')
    expect(screen.getByRole('button', { name: 'EN' })).not.toHaveClass('bg-primary')
  })
})
