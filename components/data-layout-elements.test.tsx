import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Section, Field, Tag, LimitationList, Callout, TAG_COLORS } from './data-layout-elements'

describe('Section', () => {
  it('renders a heading and its children', () => {
    render(
      <Section title="Votations">
        <p>Section body</p>
      </Section>,
    )
    expect(screen.getByRole('heading', { name: 'Votations' })).toBeInTheDocument()
    expect(screen.getByText('Section body')).toBeInTheDocument()
  })
})

describe('Field', () => {
  it('renders a label and its children', () => {
    render(<Field label="Source">BFS / opendata.swiss</Field>)
    expect(screen.getByText('Source')).toBeInTheDocument()
    expect(screen.getByText('BFS / opendata.swiss')).toBeInTheDocument()
  })
})

describe('Tag', () => {
  it('applies the color classes for each known color', () => {
    for (const color of Object.keys(TAG_COLORS) as Array<keyof typeof TAG_COLORS>) {
      const { unmount } = render(<Tag color={color}>{color}</Tag>)
      const classes = TAG_COLORS[color].split(' ')
      expect(screen.getByText(color)).toHaveClass(...classes)
      unmount()
    }
  })
})

describe('LimitationList', () => {
  it('renders one list item per limitation', () => {
    render(<LimitationList items={['First limitation', 'Second limitation']} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(screen.getByText('First limitation')).toBeInTheDocument()
    expect(screen.getByText('Second limitation')).toBeInTheDocument()
  })
})

describe('Callout', () => {
  it('renders its children', () => {
    render(<Callout>Important note</Callout>)
    expect(screen.getByText('Important note')).toBeInTheDocument()
  })
})
