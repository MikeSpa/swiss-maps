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
- 37 indicators across 10 groups: context (urban/periurban/rural typology), population, age, vital statistics (birth/death/marriage/divorce), land use, economy (employment by sector), housing, social, religion (2000 census), and politics
- Urban/rural typology: categorical 3-class map (dark blue = urban, medium = periurban, light = rural) with swatch legend
- Religion: Catholic %, Reformed %, Muslim %, no religion %, other — from 2000 census (last available at municipality level)
- Party votes shown individually plus a computed left–right index (diverging red↔blue scale)
- Sequential blue scale for continuous indicators; P5–P95 domain per topic

**Trade map (`/trade`)**
- World choropleth map with curved arc lines connecting Switzerland to each trading partner
- Arc width = total trade volume; arc color = green (CH surplus) / red (CH deficit); sector filter changes arc color to sector color and sizes by sector volume
- Per-country sector breakdown (pharma, machines, watches, precision, metals…) from SwissImpex 2025 HS8 data — shown in hover tooltip and country card
- Click a country dot or sidebar row to select and pin the detail card; click Switzerland to show all flows
- FTA status filter (EU bilateral / in force / framework / negotiating / signed / all)
- 96 trading partners from official 2024 BAZG data (business cycle total, excl. precious metals)
- Sidebar shows global sector export breakdown (pharma 49%, machines 12%, watches 10%, …)

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

# Trade data (BAZG official 2024 actuals — re-run to refresh)
uv run python scripts/download_trade.py

# Demographic indicators — run all three, in order:
uv run python scripts/download_demographics.py   # BFS Regionalportraits 2021 (30 indicators, 2019 data)
uv run python scripts/download_typology.py       # swisstopo urban/periurban/rural classification
uv run python scripts/download_religion.py       # BFS 2000 census religion data (2000 data only)
```

See `pipeline/DATA_SOURCES.md` for a full breakdown of every dataset, indicator, reference year, and known limitations (income/unemployment/post-2000 religion are not available via API).

## Data sources

- **Trade (bilateral totals)**: [BAZG Annual Report 2024](https://www.bazg.admin.ch) — 2024 actuals, business cycle total (excl. precious metals), 245 countries
- **Trade (sector breakdown)**: [SwissImpex / BAZG TN8_VK](https://www.swissimpex.admin.ch) — 2025 full year, HS8 tariff × country × transport mode; used for per-country sector shares
- **Geography**: [swisstopo swissBOUNDARIES3D](https://www.swisstopo.admin.ch/en/landscape-model-swissboundaries3d) — OGD license
- **Votation results**: [opendata.swiss](https://opendata.swiss) federal votation JSON API
- **Demographic indicators**: [BFS Regionalportraits 2021](https://opendata.swiss/en/dataset/regionalportrats-2021-kennzahlen-aller-gemeinden) — 30 indicators, ref. year 2019
- **Religion**: BFS Volkszählung 2000 (PxWeb `px-x-4003000000_122`) — **2000 data only**, no municipality-level religion data exists post-2000
- **Urban/rural typology**: swisstopo `g1a22` agglomeration shapefile — 3 classes (urban/periurban/rural)

## Tech stack

Next.js 16 · React 19 · MapLibre GL JS · shadcn/ui · Tailwind CSS 4 · TypeScript · Python/GeoPandas

## notes

for easier deployment, all data is currently pushed to the repo