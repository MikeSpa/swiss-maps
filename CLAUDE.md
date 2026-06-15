# Swiss Maps — LLM Context

## What this is

Interactive geo-visualization dashboard for Swiss federal votation (referendum) results and statistics. Shows results as a choropleth map at canton, district, and municipality level. Supports all 4 Swiss national languages + English.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Map | MapLibre GL JS 5 via `react-map-gl` 8 |
| UI components | shadcn/ui, Tailwind CSS 4, lucide-react |
| Package manager | **pnpm** (not npm/yarn) |
| Data pipeline | Python 3.11+, **uv** (not pip/venv), GeoPandas |

## Architecture — pure static, no backend

```
Python pipeline → public/geo/*.geojson     (geography)
               → public/votations/*.json   (votation results)
                        ↓
             Next.js serves as static assets
                        ↓
              Browser fetches & renders
```

No API routes, no database. All data is preprocessed and served as static files. This is intentional — votation data is read-only and changes only on vote dates.

## Repository layout

```
swiss-maps/
├── app/                        Next.js app router
│   ├── layout.tsx              Wraps with ThemeProvider + LanguageProvider
│   └── page.tsx                Renders <AppLayout />
├── components/
│   ├── app-layout.tsx          Client component — owns sidebarOpen state
│   ├── app-header.tsx          Header with nav, language switcher, mobile toggle
│   ├── app-sidebar.tsx         Sidebar — date picker, proposals, results
│   ├── map-shell.tsx           Client component — owns selection + votation state
│   ├── map-loader.tsx          dynamic() wrapper (ssr:false) for SwissMap
│   ├── swiss-map.tsx           MapLibre map — all map logic lives here
│   └── language-switcher.tsx   DE/FR/IT/RM/EN toggle
├── contexts/
│   └── language.tsx            LanguageProvider + useLanguage() hook
├── lib/
│   ├── votation.ts             Types, fetcher, result map builders
│   ├── i18n.ts                 All UI translations (5 languages)
│   └── utils.ts                shadcn cn() helper
├── public/
│   ├── geo/                    Generated GeoJSON (gitignored, from pipeline)
│   │   ├── cantons.geojson
│   │   ├── districts.geojson
│   │   └── municipalities.geojson
│   └── votations/              Votation JSON files (gitignored, from pipeline)
│       ├── index.json          ← COMMITTED — lists available dates
│       ├── 20260614.json
│       ├── 20260308.json
│       ├── 20251130.json
│       └── 20250928.json
└── pipeline/                   Python data pipeline
    ├── pyproject.toml          uv project file
    ├── scripts/
    │   ├── download_boundaries.py   Downloads swisstopo GeoPackage (~50MB)
    │   ├── export_geo.py            Converts GeoPackage → GeoJSON in public/geo/
    │   └── download_votations.py    Downloads votation JSONs to public/votations/
    ├── notebooks/
    │   └── 01_explore_boundaries.ipynb
    └── README.md
```

## Critical join keys

The geo files and votation JSON share these identifiers:

| Level | GeoJSON property | Votation JSON field | Example |
|-------|-----------------|---------------------|---------|
| Canton | `kantonsnummer` (int) | `kantone[].geoLevelnummer` (string) | `1` = Zürich |
| District | `bezirksnummer` (int) | `bezirke[].geoLevelnummer` (string) | `101` = Bezirk Affoltern |
| Municipality | `bfs_nummer` (int) | `gemeinden[].geoLevelnummer` (string) | `2` = Affoltern am Albis |

The votation JSON uses strings; the GeoJSON uses integers. Always `parseInt(..., 10)` when building lookup maps. Verified: 160/161 Zürich municipalities match (1 miss = merged commune).

**Cantons with no districts** (correct data, not a bug): Geneva, Uri, Obwald, Nidwald, Glarus, Zug, Appenzell Ausserrhoden, Appenzell Innerrhoden, Basel-Stadt.

## State flow

```
AppLayout        sidebarOpen: boolean
  └── AppHeader  receives onToggleSidebar
  └── MapShell   owns all votation + map selection state
        ├── votation: VotationData | null      (loaded from /votations/*.json)
        ├── selectedDate: string               (e.g. "20260308")
        ├── selectedVorlageId: number          (proposal within the date)
        ├── selection: { cantonNum, cantonName } | null
        ├── cantonResults    → built with buildCantonResultMap()
        ├── districtResults  → built with buildDistrictResultMap() when canton selected
        ├── municipalityResults → built with buildMunicipalityResultMap() when canton selected
        ├── AppSidebar       receives all of the above as props
        └── MapLoader → SwissMap  receives results as props, owns GeoJSON state
```

## Map component (swiss-map.tsx)

- Loads GeoJSON lazily: cantons + districts on mount, municipalities on first canton click
- `mergeResults(collection, results, keyProp)` — generic function that merges result data into GeoJSON feature properties (`ja_pct`, `turnout`, `ausgezaehlt`). `ja_pct = -1` is the sentinel for "no data" in MapLibre paint expressions
- Hover detection queries layers in priority order: `municipalities-fill` → `districts-fill` → `cantons-fill`. Uses `setFeatureState` for highlight
- Layer order: fills first (canton → district → municipality), then borders on top (same order)
- Click on canton: `fitBounds` to canton bbox, triggers `onSelect` which loads sub-canton results
- Back button: calls `onReset` + `fitBounds(SWISS_BOUNDS)`
- Base map style: `https://demotiles.maplibre.org/style.json` (free, no API key)

## Choropleth color scale

```
ja_pct < 0  → #cbd5e1  (no data, slate-300)
0%          → #b91c1c  (red-700)
35%         → #f87171  (red-400)
50%         → #94a3b8  (slate-400, neutral — NOT white)
65%         → #4ade80  (green-400)
100%        → #15803d  (green-700)
```

Midpoint is slate-400 (not white) because Swiss votations rarely exceed 65/35 splits — a white midpoint would make most maps look uniformly pale.

## i18n

Languages: `de` (default) | `fr` | `it` | `rm` | `en`

- `lib/i18n.ts` — all UI strings, typed as `typeof de` to catch missing keys
- `contexts/language.tsx` — `LanguageProvider` + `useLanguage()` hook returning `{ lang, setLang, t }`
- Data translations: votation JSON already contains `vorlagenTitel[].langKey` for de/fr/it/rm/en — use `getTitle(titles, lang)` from `lib/votation.ts`
- Adding a new UI string: add to all 5 language objects in `lib/i18n.ts` (TypeScript will error if any language is missing the key)

## Votation data format (opendata.swiss)

URL pattern: `https://ogd-static.voteinfo-app.ch/v1/ogd/sd-t-17-02-{YYYYMMDD}-eidgAbstimmung.json`

Structure:
```
root.schweiz.vorlagen[]          — array of proposals (Vorlagen)
  .vorlagenId                    — unique ID
  .vorlagenTitel[]               — multilingual titles
  .vorlagenArtId                 — type: 1=mandatory ref, 2=optional ref, 3=initiative, 5=counter-proposal, 6=tiebreaker
  .doppeltesMehr                 — true if cantonal majority (Ständemehr) is required
  .vorlageAngenommen             — true/false/null
  .resultat                      — national-level result
  .staende                       — cantonal vote counts (only relevant when doppeltesMehr=true)
  .kantone[]                     — per-canton results
    .geoLevelnummer              — canton number as string "1"–"26"
    .resultat
    .bezirke[]                   — per-district results
    .gemeinden[]                 — per-municipality results
      .geoLevelParentnummer      — parent district number
```

All `resultat` objects have: `jaStimmenInProzent`, `jaStimmenAbsolut`, `neinStimmenAbsolut`, `stimmbeteiligungInProzent`, `eingelegteStimmzettel`, `anzahlStimmberechtigte`, `gueltigeStimmen`, `gebietAusgezaehlt`. All fields are `null` until counting is complete.

## Adding a new votation date

```bash
# Download the JSON
cd pipeline
uv run python scripts/download_votations.py --add YYYYMMDD
# This downloads the file and updates public/votations/index.json
# Commit index.json afterwards
```

## Running the app

```bash
pnpm dev          # start dev server
pnpm build        # production build
pnpm typecheck    # TypeScript check
```

## Testing

```bash
pnpm test          # unit + component tests (Vitest + React Testing Library, run once)
pnpm test:watch    # same, in watch mode
pnpm test:e2e      # Playwright e2e — requires `pnpm dev` running with real pipeline data
```

- **Unit tests** (`lib/*.test.ts`) — pure functions in `lib/`, co-located with the source file.
- **Component tests** (`components/*.test.tsx`) — Vitest + React Testing Library, jsdom environment.
  Use `renderWithProviders` from `test/test-utils.tsx` for components that call `useLanguage()`
  (it wraps in `LanguageProvider`); plain `render` from `@testing-library/react` is fine for
  components with no context dependency.
- **Config**: `vitest.config.ts` (jsdom env, `@` alias matches `tsconfig.json`, excludes `e2e/`),
  `vitest.setup.ts` (jest-dom matchers + RTL `cleanup()` after each test).
- **E2E specs** (`e2e/*.spec.ts`) — Playwright, config in `playwright.config.ts`. Runs against the
  local dev server (`pnpm dev`); needs `public/geo` + `public/votations` to exist locally (pipeline
  output, gitignored). Not yet wired into CI for that reason — see `TODO.md`.
- **CI** (`.github/workflows/ci.yml`) — runs `pnpm lint`, `pnpm typecheck`, `pnpm test` on push/PR.
  Does not run `pnpm test:e2e`.

## Running the pipeline

```bash
cd pipeline
uv sync                                          # install deps
uv run python scripts/download_boundaries.py    # one-time, ~50MB
uv run python scripts/export_geo.py             # regenerate public/geo/
uv run python scripts/download_votations.py     # refresh all votation JSONs
```

## Known limitations / gotchas

- **MapLibre SSR**: SwissMap must be dynamically imported with `ssr: false` (done via `map-loader.tsx`). Do not import SwissMap directly in server components
- **Source duplication**: Fills and borders use separate `<Source>` elements (e.g. `cantons` + `cantons-borders`) to control layer ordering — fills must render before borders. Don't merge them
- **Municipality size**: `municipalities.geojson` is 4.2MB. It's lazy-loaded only on first canton click. Keep it that way
- **Votation JSON CORS**: The external votation URLs block browser CORS. Files must be downloaded and served from `/public/votations/`. Never fetch the external URL directly from client code
- **`as const` on paint expressions**: MapLibre type expressions need `ExpressionSpecification` type or `as const` — the linter enforces this
- **Romansh**: `rm` translations are Rumantsch Grischun approximations, not verified by a native speaker
