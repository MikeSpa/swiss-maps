"""
Downloads the latest swissBOUNDARIES3D GeoPackage from swisstopo via the STAC API.
Output: pipeline/data/raw/swissboundaries3d.gpkg
"""

import io
import zipfile
from pathlib import Path

import requests

STAC_ITEMS_URL = (
    "https://data.geo.admin.ch/api/stac/v1/collections"
    "/ch.swisstopo.swissboundaries3d/items"
)
RAW_DIR = Path(__file__).parent.parent / "data" / "raw"


def get_gpkg_url() -> str:
    resp = requests.get(STAC_ITEMS_URL, timeout=30)
    resp.raise_for_status()
    items = resp.json()["features"]

    # Most recent item first
    items.sort(key=lambda x: x["properties"].get("datetime", ""), reverse=True)
    latest = items[0]

    assets = latest["assets"]
    # Prefer LV95 (EPSG:2056) GeoPackage — key contains "2056" and ".gpkg"
    for key, asset in assets.items():
        href = asset["href"]
        if "2056" in key and href.endswith((".gpkg.zip", ".gpkg")):
            return href

    # Fallback: any gpkg asset
    for key, asset in assets.items():
        if ".gpkg" in asset["href"]:
            return asset["href"]

    raise ValueError(f"No GeoPackage asset found. Available: {list(assets.keys())}")


def download(url: str, dest: Path) -> None:
    print(f"Downloading {url}")
    resp = requests.get(url, stream=True, timeout=120)
    resp.raise_for_status()

    total = int(resp.headers.get("content-length", 0))
    received = 0
    chunks = []
    for chunk in resp.iter_content(chunk_size=1024 * 256):
        chunks.append(chunk)
        received += len(chunk)
        if total:
            print(f"\r  {received / 1e6:.1f} / {total / 1e6:.1f} MB", end="", flush=True)
    print()

    data = b"".join(chunks)

    if url.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(data)) as zf:
            gpkg_names = [n for n in zf.namelist() if n.endswith(".gpkg")]
            if not gpkg_names:
                raise ValueError(f"No .gpkg inside zip. Contents: {zf.namelist()}")
            zf.extract(gpkg_names[0], dest.parent)
            extracted = dest.parent / gpkg_names[0]
            extracted.rename(dest)
            print(f"Extracted to {dest}")
    else:
        dest.write_bytes(data)
        print(f"Saved to {dest}")


def main() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    dest = RAW_DIR / "swissboundaries3d.gpkg"

    if dest.exists():
        print(f"Already exists: {dest} (delete to re-download)")
        return

    url = get_gpkg_url()
    download(url, dest)


if __name__ == "__main__":
    main()
