import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { usePathname } from 'next/navigation'
import { renderWithProviders, screen } from '@/test/test-utils'
import { AppHeader } from './app-header'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

describe('AppHeader', () => {
  it('renders the brand and all nav links', () => {
    vi.mocked(usePathname).mockReturnValue('/')
    renderWithProviders(<AppHeader onToggleSidebar={() => {}} />)
    expect(screen.getByText('Swiss Maps')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Votations' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Demographics' })).toHaveAttribute('href', '/demographics')
    expect(screen.getByRole('link', { name: 'Trade' })).toHaveAttribute('href', '/trade')
    expect(screen.getByRole('link', { name: 'Data' })).toHaveAttribute('href', '/data')
  })

  it('highlights the link matching the current path', () => {
    vi.mocked(usePathname).mockReturnValue('/trade')
    renderWithProviders(<AppHeader onToggleSidebar={() => {}} />)
    expect(screen.getByRole('link', { name: 'Trade' })).toHaveClass('text-foreground')
    expect(screen.getByRole('link', { name: 'Votations' })).toHaveClass('text-muted-foreground')
  })

  it('calls onToggleSidebar when the mobile menu button is clicked', async () => {
    vi.mocked(usePathname).mockReturnValue('/')
    const onToggleSidebar = vi.fn()
    renderWithProviders(<AppHeader onToggleSidebar={onToggleSidebar} />)
    await userEvent.click(screen.getByRole('button', { name: 'Toggle sidebar' }))
    expect(onToggleSidebar).toHaveBeenCalledOnce()
  })
})
