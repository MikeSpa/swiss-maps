import { describe, it, expect } from 'vitest'
import type { FeatureCollection, Geometry } from 'geojson'
import { featureBounds, mergeResults } from './map-utils'
import type { Resultat } from './votation'

const emptyResultat: Resultat = {
  gebietAusgezaehlt: false,
  jaStimmenInProzent: null,
  jaStimmenAbsolut: null,
  neinStimmenAbsolut: null,
  stimmbeteiligungInProzent: null,
  eingelegteStimmzettel: null,
  anzahlStimmberechtigte: null,
  gueltigeStimmen: null,
}

describe('featureBounds', () => {
  it('returns the min/max lng/lat across a polygon', () => {
    const polygon: Geometry = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [2, 0],
          [2, 3],
          [0, 3],
          [0, 0],
        ],
      ],
    }
    expect(featureBounds(polygon)).toEqual([
      [0, 0],
      [2, 3],
    ])
  })
})

describe('mergeResults', () => {
  const collection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { bfs_nummer: 1 }, geometry: { type: 'Point', coordinates: [0, 0] } },
      { type: 'Feature', properties: { bfs_nummer: 2 }, geometry: { type: 'Point', coordinates: [0, 0] } },
    ],
  }

  const results: Record<number, Resultat> = {
    1: { ...emptyResultat, jaStimmenInProzent: 55, stimmbeteiligungInProzent: 40, gebietAusgezaehlt: true },
  }

  it('merges matching results into feature properties', () => {
    const merged = mergeResults(collection, results, 'bfs_nummer')
    expect(merged.features[0].properties).toMatchObject({
      ja_pct: 55,
      turnout: 40,
      ausgezaehlt: true,
    })
  })

  it('uses the -1 sentinel for features with no matching result', () => {
    const merged = mergeResults(collection, results, 'bfs_nummer')
    expect(merged.features[1].properties).toMatchObject({
      ja_pct: -1,
      turnout: -1,
      ausgezaehlt: false,
    })
  })

  it('returns the collection unchanged when results is null', () => {
    expect(mergeResults(collection, null, 'bfs_nummer')).toBe(collection)
  })
})
