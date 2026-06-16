"""
Downloads two language datasets and outputs per-municipality language data as
public/demographics/language.json:

1. Official linguistic region (Sprachgebiet), current (2026 boundaries)
   Source: BFS commune register "Raumgliederungen der Gemeinden" API
   URL: https://www.agvchapp.bfs.admin.ch/api/communes/levels?date=01-01-2026
   Column SPRGEB2020: 1=German, 2=French, 3=Italian, 4=Romansh

2. Main language spoken at home (Hauptsprache), 2000 census
   Source: BFS Volkszählung 2000, PxWeb table px-x-4003000000_123
   "Wohnbevölkerung 2000 nach Wohnsitztyp, Gemeinde, Staatsangehörigkeit
   und Hauptsprache"
   Same vintage/limitations as download_religion.py (2000 data only).

Output indicators per commune:
  official_language_region — categorical 1=German, 2=French, 3=Italian, 4=Romansh
  lang_german_pct           — main language German (2000 census)
  lang_french_pct           — main language French
  lang_italian_pct          — main language Italian
  lang_romansh_pct          — main language Romansh
  lang_other_pct            — everything else (English, Portuguese, Serbo-Croatian,
                               Albanian, etc.) = 100 - the four national languages

Usage:
  uv run python scripts/download_language.py
  uv run python scripts/download_language.py --force   # re-fetch home-language batches
"""

import argparse
import csv
import io
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).parent.parent.parent
OUT_DIR = ROOT / "public" / "demographics"

LEVELS_URL = "https://www.agvchapp.bfs.admin.ch/api/communes/levels?date=01-01-2026"

LANG_API_BASE = "https://www.pxweb.bfs.admin.ch/api/v1/de/px-x-4003000000_123/px-x-4003000000_123.px"

LANG_CODES = ["0", "1", "2", "3", "4"]
# Human-readable names matching output keys (order must match LANG_CODES)
LANG_NAMES = ["total", "german", "french", "italian", "romansh"]

BATCH_SIZE = 200
SLEEP_BETWEEN_BATCHES = 1.5
RETRY_SLEEP_429 = 10.0

LANGUAGE_REGION_CATEGORIES = {
    "1": {"de": "Deutsch", "fr": "Allemand", "it": "Tedesco", "rm": "Tudestg", "en": "German"},
    "2": {"de": "Französisch", "fr": "Français", "it": "Francese", "rm": "Franzos", "en": "French"},
    "3": {"de": "Italienisch", "fr": "Italien", "it": "Italiano", "rm": "Talian", "en": "Italian"},
    "4": {"de": "Rätoromanisch", "fr": "Romanche", "it": "Romancio", "rm": "Rumantsch", "en": "Romansh"},
}


# ── 1. Official linguistic region ───────────────────────────────────────────────

def fetch_language_regions() -> dict[int, int]:
    """Return {bfs_nummer: SPRGEB2020 code (1-4)}."""
    print(f"  GET {LEVELS_URL}")
    resp = requests.get(LEVELS_URL, timeout=60, headers={"User-Agent": "swiss-maps-pipeline/1.0"})
    resp.raise_for_status()
    reader = csv.DictReader(io.StringIO(resp.text))
    result: dict[int, int] = {}
    for row in reader:
        try:
            bfs = int(row["BfsCode"])
            sprgeb = int(row["SPRGEB2020"])
        except (ValueError, KeyError):
            continue
        result[bfs] = sprgeb
    print(f"  {len(result)} communes with linguistic region")
    return result


# ── 2. Home language (2000 census) ──────────────────────────────────────────────

_METADATA_CACHE: dict = {}


def fetch_lang_metadata() -> dict:
    print(f"  GET {LANG_API_BASE}")
    resp = requests.get(LANG_API_BASE, timeout=60, headers={"User-Agent": "swiss-maps-pipeline/1.0"})
    resp.raise_for_status()
    return resp.json()


def parse_commune_indices(metadata: dict) -> list[tuple[str, int]]:
    """Return list of (pxweb_index_str, bfs_nummer) for commune-level entries."""
    geo_var = None
    for var in metadata.get("variables", []):
        if "Gemeinde" in var.get("text", ""):
            geo_var = var
            break
    if geo_var is None:
        raise RuntimeError("Could not find commune variable in PxWeb metadata")

    value_texts = geo_var.get("valueTexts", [])
    values = geo_var.get("values", [])

    communes: list[tuple[str, int]] = []
    for idx_str, label in zip(values, value_texts):
        if not label.startswith("......"):
            continue
        stripped = label.lstrip(".")
        parts = stripped.strip().split(" ", 1)
        try:
            bfs = int(parts[0])
        except (ValueError, IndexError):
            continue
        communes.append((idx_str, bfs))

    print(f"  Found {len(communes)} communes in metadata")
    return communes


def fetch_batch(commune_indices: list[str]) -> list[int]:
    """
    POST a PxWeb json-stat2 query for the given commune indices and all
    Hauptsprache codes (Staatsangehörigkeit fixed to Total). Returns flat list
    with commune varying slower than Hauptsprache (last dimension fastest):
    value[c * len(LANG_CODES) + l] = commune c, language l.
    """
    query = {
        "query": [
            {
                "code": "Wohnsitztyp",
                "selection": {"filter": "item", "values": ["0"]},
            },
            {
                "code": next(
                    var["code"]
                    for var in _METADATA_CACHE["variables"]
                    if "Gemeinde" in var.get("text", "")
                ),
                "selection": {"filter": "item", "values": commune_indices},
            },
            {
                "code": "Staatsangehörigkeit (Kategorie)",
                "selection": {"filter": "item", "values": ["0"]},
            },
            {
                "code": "Hauptsprache",
                "selection": {"filter": "item", "values": LANG_CODES},
            },
        ],
        "response": {"format": "json-stat2"},
    }

    for attempt in range(2):
        resp = requests.post(
            LANG_API_BASE,
            json=query,
            timeout=120,
            headers={"User-Agent": "swiss-maps-pipeline/1.0"},
        )
        if resp.status_code == 429:
            if attempt == 0:
                print(f"    HTTP 429 — waiting {RETRY_SLEEP_429}s then retrying...")
                time.sleep(RETRY_SLEEP_429)
                continue
            resp.raise_for_status()
        resp.raise_for_status()
        break

    return resp.json()["value"]


def compute_lang_pcts(values: list[int], commune_count: int) -> list[dict[str, float] | None]:
    """Given flat values (shape commune_count x len(LANG_CODES)), return per-commune pcts."""
    n_lang = len(LANG_CODES)
    results: list[dict[str, float] | None] = []

    for c in range(commune_count):
        row: dict[str, int] = {}
        for i, name in enumerate(LANG_NAMES):
            v = values[c * n_lang + i]
            row[name] = int(v) if v is not None else 0

        total = row["total"]
        if total == 0:
            results.append(None)
            continue

        def pct(key: str) -> float:
            return round(max(0.0, min(100.0, row[key] / total * 100)), 2)

        german = pct("german")
        french = pct("french")
        italian = pct("italian")
        romansh = pct("romansh")
        other = round(max(0.0, min(100.0, 100.0 - german - french - italian - romansh)), 2)

        results.append({
            "lang_german_pct": german,
            "lang_french_pct": french,
            "lang_italian_pct": italian,
            "lang_romansh_pct": romansh,
            "lang_other_pct": other,
        })

    return results


def fetch_home_languages() -> dict[int, dict[str, float]]:
    metadata = fetch_lang_metadata()
    _METADATA_CACHE.update(metadata)

    communes = parse_commune_indices(metadata)
    n_batches = (len(communes) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"  Fetching home-language data in {n_batches} batches of {BATCH_SIZE}...")

    all_results: dict[int, dict[str, float]] = {}
    for batch_num in range(n_batches):
        start = batch_num * BATCH_SIZE
        batch = communes[start : start + BATCH_SIZE]
        idx_strs = [c[0] for c in batch]
        bfs_nums = [c[1] for c in batch]

        print(f"    Batch {batch_num + 1}/{n_batches} ({len(batch)} communes)...")
        values = fetch_batch(idx_strs)
        pcts = compute_lang_pcts(values, len(batch))

        skipped = 0
        for bfs, result in zip(bfs_nums, pcts):
            if result is None:
                skipped += 1
                continue
            all_results[bfs] = result

        if skipped:
            print(f"      Skipped {skipped} communes with total=0")

        if batch_num < n_batches - 1:
            time.sleep(SLEEP_BETWEEN_BATCHES)

    return all_results


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download official linguistic region + 2000 census home language data."
    )
    parser.add_argument("--force", action="store_true", help="Re-fetch all batches")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    out_path = OUT_DIR / "language.json"
    if out_path.exists() and not args.force:
        print(f"  {out_path.name} already exists — use --force to re-download")
        return

    print("Fetching official linguistic regions...")
    regions = fetch_language_regions()

    print("Fetching home language (2000 census)...")
    home_lang = fetch_home_languages()

    all_bfs = set(regions) | set(home_lang)
    communes: dict[str, dict[str, float]] = {}
    for bfs in all_bfs:
        row: dict[str, float] = {}
        if bfs in regions:
            row["official_language_region"] = float(regions[bfs])
        if bfs in home_lang:
            row.update(home_lang[bfs])
        communes[str(bfs)] = row

    output = {
        "meta": {
            "linguistic_region": {
                "source": "BFS Raumgliederungen der Gemeinden (SPRGEB2020)",
                "year": 2020,
                "url": LEVELS_URL,
                "categories": LANGUAGE_REGION_CATEGORIES,
            },
            "home_language": {
                "source": "BFS Volkszählung 2000",
                "year": 2000,
                "url": LANG_API_BASE,
                "note": "2000 census data only, same limitations as religion.json.",
            },
        },
        "communes": dict(sorted(communes.items(), key=lambda kv: int(kv[0]))),
    }

    out_path.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")))
    size_kb = out_path.stat().st_size / 1024
    print(f"  Written {out_path.relative_to(ROOT)} ({size_kb:.0f} KB)")
    print(f"  {len(regions)} communes with linguistic region, {len(home_lang)} with home language")


if __name__ == "__main__":
    main()
