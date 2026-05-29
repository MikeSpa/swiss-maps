"""
Reads swissBOUNDARIES3D layers, reprojects to WGS84, simplifies, and exports
GeoJSON files to public/geo/ for use by the Next.js frontend.

Layers produced:
  public/geo/cantons.geojson       — 26 cantons
  public/geo/districts.geojson     — ~143 districts
  public/geo/municipalities.geojson — ~2200 municipalities

Key columns preserved for data joins:
  cantons:       kantonsnummer (1–26), name
  districts:     bezirksnummer (3-digit), name, kantonsnummer
  municipalities: bfs_nummer, name, bezirksnummer, kantonsnummer
"""

from pathlib import Path

import geopandas as gpd

RAW_GPKG = Path(__file__).parent.parent / "data" / "raw" / "swissboundaries3d.gpkg"
OUT_DIR = Path(__file__).parent.parent.parent / "public" / "geo"

# Tolerance in degrees (~100m at Swiss latitudes). Increase for smaller files.
SIMPLIFY_TOLERANCE = 0.001

LAYERS = {
    "cantons": {
        "gpkg_layer": "tlm_kantonsgebiet",
        "keep_cols": ["kantonsnummer", "name"],
    },
    "districts": {
        "gpkg_layer": "tlm_bezirksgebiet",
        "keep_cols": ["bezirksnummer", "name", "kantonsnummer"],
    },
    "municipalities": {
        "gpkg_layer": "tlm_hoheitsgebiet",
        "keep_cols": ["bfs_nummer", "name", "bezirksnummer", "kantonsnummer"],
    },
}


def export_layer(name: str, config: dict) -> None:
    print(f"\nProcessing {name}...")
    gdf = gpd.read_file(RAW_GPKG, layer=config["gpkg_layer"])
    print(f"  {len(gdf)} features, CRS: {gdf.crs}")
    print(f"  Columns: {gdf.columns.tolist()}")

    # Reproject to WGS84
    gdf = gdf.to_crs("EPSG:4326")

    # Keep only useful columns + geometry
    available = [c for c in config["keep_cols"] if c in gdf.columns]
    missing = [c for c in config["keep_cols"] if c not in gdf.columns]
    if missing:
        print(f"  WARNING: expected columns not found: {missing}")
        print(f"  Actual columns: {gdf.columns.tolist()}")
    gdf = gdf[available + ["geometry"]]

    # Simplify geometry
    gdf["geometry"] = gdf["geometry"].simplify(SIMPLIFY_TOLERANCE, preserve_topology=True)

    out_path = OUT_DIR / f"{name}.geojson"
    gdf.to_file(out_path, driver="GeoJSON")

    size_kb = out_path.stat().st_size / 1024
    print(f"  Saved {out_path.name} ({size_kb:.0f} KB)")


def main() -> None:
    if not RAW_GPKG.exists():
        raise FileNotFoundError(
            f"{RAW_GPKG} not found — run scripts/download_boundaries.py first"
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for name, config in LAYERS.items():
        export_layer(name, config)

    print("\nDone. Files in public/geo/:")
    for f in sorted(OUT_DIR.glob("*.geojson")):
        print(f"  {f.name}  ({f.stat().st_size / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
