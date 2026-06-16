import type { FeatureCollection } from 'geojson'
import type { Resultat } from './votation'

export function featureBounds(geometry: GeoJSON.Geometry): [[number, number], [number, number]] {
  const lngs: number[] = []
  const lats: number[] = []
  function walk(c: unknown) {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      lngs.push(c[0] as number)
      lats.push(c[1] as number)
    } else if (Array.isArray(c)) {
      c.forEach(walk)
    }
  }
  walk((geometry as { coordinates: unknown }).coordinates)
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

/** Merges result data into a GeoJSON FeatureCollection.
 *  ja_pct = -1 is the sentinel for "no data" used in paint expressions. */
export function mergeResults(
  collection: FeatureCollection,
  results: Record<number, Resultat> | null,
  keyProp: string,
): FeatureCollection {
  if (!results) return collection
  return {
    ...collection,
    features: collection.features.map((f) => {
      const r = results[f.properties?.[keyProp] as number]
      return {
        ...f,
        properties: {
          ...f.properties,
          ja_pct: r?.jaStimmenInProzent ?? -1,
          turnout: r?.stimmbeteiligungInProzent ?? -1,
          ausgezaehlt: r?.gebietAusgezaehlt ?? false,
        },
      }
    }),
  }
}
