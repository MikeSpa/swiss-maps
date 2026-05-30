# Swiss Maps

Interactive visualization of Swiss federal votation results on a geographic map.

## Features

- Choropleth map colored by % yes votes at canton, district, and municipality level
- Click a canton to zoom in and see district/municipality breakdown
- Hover tooltips with result details
- 4 past and upcoming votation dates (Sep/Nov 2025, Mar/Jun 2026)
- Full i18n: DE / FR / IT / RM / EN (UI + votation titles from official data)
- Mobile-responsive with collapsible sidebar

## Running locally

```bash
# Install dependencies
pnpm install

# Start dev server (requires geo files — see Data pipeline below)
pnpm dev
```

## Data pipeline

Geographic boundaries and votation results are preprocessed by a Python pipeline and served as static files.

```bash
cd pipeline
uv sync

# Download Swiss boundaries from swisstopo (~50MB, one-time)
uv run python scripts/download_boundaries.py
uv run python scripts/export_geo.py

# Download votation results
uv run python scripts/download_votations.py

# Add a new votation date
uv run python scripts/download_votations.py --add YYYYMMDD
```

See `pipeline/README.md` for full documentation.

## Data sources

- **Geography**: [swisstopo swissBOUNDARIES3D](https://www.swisstopo.admin.ch/en/landscape-model-swissboundaries3d) — official Swiss federal boundaries, OGD license
- **Votation results**: [opendata.swiss](https://opendata.swiss) federal votation JSON API

## Tech stack

Next.js 16 · React 19 · MapLibre GL JS · shadcn/ui · Tailwind CSS 4 · TypeScript · Python/GeoPandas
