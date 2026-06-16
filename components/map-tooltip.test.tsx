import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapTooltip } from './map-tooltip'

describe('MapTooltip', () => {
  it('renders its children', () => {
    render(
      <MapTooltip x={100} y={50}>
        <span>Zürich</span>
      </MapTooltip>,
    )
    expect(screen.getByText('Zürich')).toBeInTheDocument()
  })

  it('positions itself offset from the given coordinates', () => {
    const { container } = render(
      <MapTooltip x={100} y={50}>
        <span>Zürich</span>
      </MapTooltip>,
    )
    const tooltip = container.firstChild as HTMLElement
    expect(tooltip.style.left).toBe('112px')
    expect(tooltip.style.top).toBe('10px')
  })
})
