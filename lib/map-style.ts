import type { StyleSpecification } from 'maplibre-gl'

export const MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json'

/** Votations + demographics pages: strip all base layers except background.
 *  Only ocean/background color remains; Switzerland's GeoJSON renders on top. */
export async function loadStrippedStyle(): Promise<StyleSpecification> {
  const style: StyleSpecification = await fetch(MAP_STYLE_URL).then(r => r.json())
  return {
    ...style,
    layers: style.layers.filter(layer => layer.type === 'background'),
  }
}

/** Trade page (and any page needing world context): full demotiles style as-is. */
export async function loadWorldStyle(): Promise<StyleSpecification> {
  return fetch(MAP_STYLE_URL).then(r => r.json())
}
