import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl'

export const MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json'

/** Loads the base demotiles style. Votations + demographics pages pass
 *  stripLayers=true to keep only the background layer, since Switzerland's
 *  GeoJSON renders on top. Trade page needs the full world style as-is. */
export async function loadMapStyle(stripLayers = false): Promise<StyleSpecification> {
  const style: StyleSpecification = await fetch(MAP_STYLE_URL).then(r => r.json())
  if (!stripLayers) return style
  return {
    ...style,
    layers: style.layers.filter(layer => layer.type === 'background'),
  }
}

export const HOVER_OPACITY: ExpressionSpecification = [
  'case', ['boolean', ['feature-state', 'hover'], false], 0.95, 0.8,
]

// No-data: light slate. Scale: strong red → slate-400 midpoint → strong green.
// Midpoint is a visible neutral (not white) so 40% vs 60% are clearly distinct.
export const CHOROPLETH_COLOR: ExpressionSpecification = [
  'case',
  ['<', ['get', 'ja_pct'], 0],
  '#cbd5e1',
  [
    'interpolate', ['linear'], ['get', 'ja_pct'],
    0,   '#b91c1c',
    35,  '#f87171',
    50,  '#94a3b8',
    65,  '#4ade80',
    100, '#15803d',
  ],
]
