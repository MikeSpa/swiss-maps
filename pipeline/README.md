# Pipeline

Preprocesses Swiss geodata into GeoJSON files served by the Next.js frontend.

## Setup

```bash
cd pipeline
uv sync
uv add --dev ipykernel
uv run python -m ipykernel install --user --name swiss-maps-pipeline --display-name "swiss-maps-pipeline"
```

See `JUPYTER_SETUP.md` for VS Code kernel setup.

## Running the pipeline

**First time (downloads ~50MB from swisstopo):**
```bash
uv run python scripts/download_boundaries.py
```

**Export GeoJSON (run whenever you want to regenerate map files):**
```bash
uv run python scripts/export_geo.py
```

Output lands in `../public/geo/` and is served statically by Next.js.

## Output files

| File | Size | Description |
|------|------|-------------|
| `public/geo/cantons.geojson` | ~573 KB | 26 cantons |
| `public/geo/districts.geojson` | ~1.1 MB | ~143 districts |
| `public/geo/municipalities.geojson` | ~4.2 MB | ~2200 municipalities |

## Join keys

These columns link geometry to votation/statistics data:

| Layer | Column | Example | Votation field |
|-------|--------|---------|----------------|
| cantons | `kantonsnummer` | `1` = Zürich | `kantone[].geoLevelnummer` |
| districts | `bezirksnummer` | `101` = Bezirk Affoltern | `bezirke[].geoLevelnummer` |
| municipalities | `bfs_nummer` | `2` = Affoltern am Albis | `gemeinden[].geoLevelnummer` |

## Data source

**swisstopo swissBOUNDARIES3D** — official Swiss federal boundaries, free OGD license.
Downloaded via STAC API at `data.geo.admin.ch`. Released annually (usually January).

## Re-downloading

Delete the cached file and re-run:
```bash
rm pipeline/data/raw/swissboundaries3d.gpkg
uv run python scripts/download_boundaries.py
uv run python scripts/export_geo.py
```

## Votation data

Votation JSON files are downloaded from opendata.swiss and served from `public/votations/`.
`public/votations/index.json` (committed) lists the available dates.

**Download all listed votations:**
```bash
uv run python scripts/download_votations.py
```

**Add a new votation date:**
```bash
uv run python scripts/download_votations.py --add 20260914
```

This downloads the file and adds the entry to `index.json`. Commit `index.json` afterwards.

## Notebooks

`notebooks/01_explore_boundaries.ipynb` — one-time exploration to verify column names
and join keys. Not part of the regular pipeline.
