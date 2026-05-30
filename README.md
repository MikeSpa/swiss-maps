# Swiss Maps

Interactive visualization of Swiss federal votation results and demographic statistics on a geographic map.

## Features

**Votation map (`/`)**
- Choropleth map colored by % yes votes at canton, district, and municipality level
- Click a canton to zoom in and see district/municipality breakdown
- Hover tooltips with result details
- 4 past and upcoming votation dates (Sep/Nov 2025, Mar/Jun 2026)
- Defaults to the most recent past votation (skips future dates with no data)

**Demographics map (`/demographics`)**
- Municipality-level choropleth for 30 indicators across 8 groups: population, age, vital statistics (birth/death/marriage/divorce), land use, economy (employment by sector), housing, social, and politics
- Party votes shown individually plus a computed left–right index (diverging red↔blue scale)
- Sequential blue scale for all other indicators; all domains auto-computed at P5–P95 to avoid outlier stretch
- Canton borders overlaid for geographic reference
- Source: BFS Regionalportraits 2021 (reference year 2019)

**Correlation scatter (in votation sidebar)**
- Inline SVG scatter: X = any demographic indicator, Y = % yes votes
- Shows canton-level dots (26 points) by default; switches to municipality-level dots when a canton is selected
- Linear regression line + Pearson r with plain-language interpretation
- Topic picker groups match the demographics page

**Shared**
- Full i18n: DE / FR / IT / RM / EN (UI + votation titles from official data)
- Mobile-responsive with collapsible sidebar
- English as default language

## Running locally

```bash
pnpm install
pnpm dev        # requires geo + data files — see pipeline below
```

## Data pipeline

All data is preprocessed by a Python pipeline (requires `uv`) and served as static files.

```bash
cd pipeline
uv sync

# One-time: Swiss boundaries from swisstopo (~50MB)
uv run python scripts/download_boundaries.py
uv run python scripts/export_geo.py

# Votation results
uv run python scripts/download_votations.py
uv run python scripts/download_votations.py --add YYYYMMDD   # add a new date

# Demographic indicators (BFS Regionalportraits)
uv run python scripts/download_demographics.py
```

The demographics script downloads the BFS Regionalportraits CSV, extracts 11 indicators for all ~2150 Swiss municipalities, aggregates canton-level means, and writes `public/demographics/index.json`. Re-run after `export_geo.py` to enable canton aggregates.

## Data sources

- **Geography**: [swisstopo swissBOUNDARIES3D](https://www.swisstopo.admin.ch/en/landscape-model-swissboundaries3d) — official Swiss federal boundaries, OGD license
- **Votation results**: [opendata.swiss](https://opendata.swiss) federal votation JSON API
- **Demographics**: [BFS Regionalportraits 2021](https://opendata.swiss/en/dataset/regionalportrats-2021-kennzahlen-aller-gemeinden) — Federal Statistical Office commune key indicators

## Tech stack

Next.js 16 · React 19 · MapLibre GL JS · shadcn/ui · Tailwind CSS 4 · TypeScript · Python/GeoPandas

## notes

for easier deployment, all data is currently pushed to the repo