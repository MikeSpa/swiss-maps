import { describe, it, expect, vi } from 'vitest'
import type { StyleSpecification } from 'maplibre-gl'
import { loadMapStyle } from './map-style'

const style: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    { id: 'background', type: 'background' },
    { id: 'water', type: 'fill', source: 'x', 'source-layer': 'water' },
    { id: 'roads', type: 'line', source: 'x', 'source-layer': 'roads' },
  ],
}

function stubFetch() {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: () => Promise.resolve(style) }))
}

describe('loadMapStyle', () => {
  it('returns the style unchanged when stripLayers is false', async () => {
    stubFetch()
    const result = await loadMapStyle(false)
    expect(result.layers).toHaveLength(3)
  })

  it('keeps only background layers when stripLayers is true', async () => {
    stubFetch()
    const result = await loadMapStyle(true)
    expect(result.layers).toEqual([{ id: 'background', type: 'background' }])
  })

  it('defaults to not stripping layers', async () => {
    stubFetch()
    const result = await loadMapStyle()
    expect(result.layers).toHaveLength(3)
  })
})
