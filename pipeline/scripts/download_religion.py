"""
Downloads BFS 2000 Census religion data (PxWeb table px-x-4003000000_122) and
outputs per-municipality religion percentages as public/demographics/religion.json.

Source: BFS Volkszählung 2000 — Bevölkerung nach Religion
PxWeb table: px-x-4003000000_122
API base:    https://www.pxweb.bfs.admin.ch/api/v1/de/px-x-4003000000_000/px-x-4003000000_122.px

IMPORTANT: This is 2000 data only. Post-2000 religion statistics (Strukturerhebung)
are sampled surveys representative only at canton level or for municipalities with
3,000+ annual respondents — not suitable for municipality-level choropleth maps.

Variables used:
  Wohnsitztyp:                                  '0' (civil residence = Zivilrechtlicher
                                                 Wohnsitz)
  Kanton (-) / Bezirk (>>) / Gemeinde (......): commune indices (not BFS numbers)
  Religion:                                     see RELIGION_CODES below

Religion codes in the raw table:
  '0'  = Total
  '1'  = Reformiert (Reformed Protestant)
  '8'  = Katholisch (Roman Catholic)
  '12' = Jüdisch (Jewish)
  '13' = Islamisch (Islamic / Muslim)
  '17' = Konfessionslos (No religion)
  '18' = Keine Angabe (No data / not stated)

Output indicators per commune (all rounded to 2 decimal places, clamped [0,100]):
  reformed_pct    — Reformed Protestant
  catholic_pct    — Roman Catholic
  muslim_pct      — Islamic
  jewish_pct      — Jewish
  no_religion_pct — No religion
  other_pct       — everything else (100 - reformed - catholic - muslim - jewish - no_religion)

Note: commune boundaries changed between 2000 and today; ~5–10% of BFS numbers may
not match current municipalities.geojson entries (merged communes).

Usage:
  uv run python scripts/download_religion.py
  uv run python scripts/download_religion.py --force   # re-fetch all batches
"""

import argparse
import json
import time
from pathlib import Path

import requests

ROOT = Path(__file__).parent.parent.parent
OUT_DIR = ROOT / "public" / "demographics"

API_BASE = "https://www.pxweb.bfs.admin.ch/api/v1/de/px-x-4003000000_122/px-x-4003000000_122.px"

RELIGION_CODES = ["0", "1", "8", "12", "13", "17", "18"]
# Human-readable names matching output keys (order must match RELIGION_CODES)
RELIGION_NAMES = ["total", "reformed", "catholic", "jewish", "muslim", "no_religion", "no_data"]

WOHNSITZ_TYPE = "0"        # civil residence
BATCH_SIZE = 200           # communes per API request
SLEEP_BETWEEN_BATCHES = 1.5  # seconds
RETRY_SLEEP_429 = 10.0     # seconds to wait on HTTP 429


# ── Metadata fetch ─────────────────────────────────────────────────────────────

def fetch_metadata() -> dict:
    """Return the full table metadata JSON from PxWeb."""
    print(f"  GET {API_BASE}")
    resp = requests.get(API_BASE, timeout=60, headers={"User-Agent": "swiss-maps-pipeline/1.0"})
    resp.raise_for_status()
    return resp.json()


def parse_commune_indices(metadata: dict) -> list[tuple[str, int]]:
    """
    Return list of (pxweb_index_str, bfs_nummer) for all commune-level entries.

    The variable label contains "Gemeinde" entries formatted as:
      "......0001 Aeugst am Albis"   → bfs=1, index string from valueTexts position
    Canton entries start with "-" and district entries start with ">>".
    We skip both; communes start with "......".
    """
    # Find the geographical variable (contains Kanton/Bezirk/Gemeinde)
    geo_var = None
    for var in metadata.get("variables", []):
        if "Gemeinde" in var.get("text", ""):
            geo_var = var
            break
    if geo_var is None:
        raise RuntimeError("Could not find commune variable in PxWeb metadata")

    value_texts = geo_var.get("valueTexts", [])
    values = geo_var.get("values", [])  # the index codes used in POST queries

    communes: list[tuple[str, int]] = []
    for idx_str, label in zip(values, value_texts):
        if not label.startswith("......"):
            continue  # skip canton (-) and district (>>) lines
        # Extract BFS number: strip leading dots and spaces, take first token
        stripped = label.lstrip(".")
        parts = stripped.strip().split(" ", 1)
        try:
            bfs = int(parts[0])
        except (ValueError, IndexError):
            continue
        communes.append((idx_str, bfs))

    print(f"  Found {len(communes)} communes in metadata")
    return communes


# ── Data fetch ─────────────────────────────────────────────────────────────────

def fetch_batch(commune_indices: list[str]) -> list[int]:
    """
    POST a PxWeb JSON-stat query for the given commune indices and all religion
    codes. Returns flat list of values with religion varying slowest, commune
    fastest (i.e. length = len(RELIGION_CODES) * len(commune_indices)).

    Retries once on HTTP 429.
    """
    query = {
        "query": [
            {
                "code": "Wohnsitztyp",
                "selection": {"filter": "item", "values": [WOHNSITZ_TYPE]},
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
                "code": "Religion",
                "selection": {"filter": "item", "values": RELIGION_CODES},
            },
        ],
        "response": {"format": "json-stat2"},
    }

    for attempt in range(2):
        resp = requests.post(
            API_BASE,
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

    data = resp.json()
    # json-stat2: values array is flat; dimensions are (Wohnsitztyp=1, Religion=7, commune=N)
    # Since Wohnsitztyp is fixed to 1 value, effective shape is [religion][commune]
    return data["value"]


# Module-level cache so fetch_batch can access geo variable code
_METADATA_CACHE: dict = {}


# ── Processing ─────────────────────────────────────────────────────────────────

def compute_religion_pcts(
    values: list[int],
    commune_count: int,
) -> list[dict[str, float] | None]:
    """
    Given flat values array [religion0_commune0, religion0_commune1, ...
                              religion1_commune0, ...] with shape
    (n_religions, commune_count), return list of per-commune dicts (or None
    when total=0).

    The json-stat2 ordering follows the `id` array: (Wohnsitztyp, Gemeinde, Religion).
    - Wohnsitztyp varies slowest (only 1 value, so ignored)
    - Gemeinde varies next
    - Religion varies fastest
    So value at position [c * n_rel + r] is commune c, religion r.
    """
    n_rel = len(RELIGION_CODES)
    results: list[dict[str, float] | None] = []

    for c in range(commune_count):
        row: dict[str, int] = {}
        for r, name in enumerate(RELIGION_NAMES):
            v = values[c * n_rel + r]
            row[name] = int(v) if v is not None else 0

        total = row["total"]
        if total == 0:
            results.append(None)
            continue

        def pct(key: str) -> float:
            return round(max(0.0, min(100.0, row[key] / total * 100)), 2)

        reformed = pct("reformed")
        catholic = pct("catholic")
        muslim = pct("muslim")
        jewish = pct("jewish")
        no_religion = pct("no_religion")
        other = round(max(0.0, min(100.0, 100.0 - reformed - catholic - muslim - jewish - no_religion)), 2)

        results.append(
            {
                "reformed_pct": reformed,
                "catholic_pct": catholic,
                "muslim_pct": muslim,
                "jewish_pct": jewish,
                "no_religion_pct": no_religion,
                "other_pct": other,
            }
        )

    return results


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download BFS 2000 census religion data for Swiss communes."
    )
    parser.add_argument("--force", action="store_true", help="Re-fetch all batches")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    out_path = OUT_DIR / "religion.json"
    if out_path.exists() and not args.force:
        print(f"  {out_path.name} already exists — use --force to re-download")
        return

    print("Fetching PxWeb metadata...")
    metadata = fetch_metadata()
    _METADATA_CACHE.update(metadata)

    print("Parsing commune list from metadata...")
    communes = parse_commune_indices(metadata)  # [(idx_str, bfs_nummer), ...]

    # Batch into groups of BATCH_SIZE
    n_batches = (len(communes) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"Fetching religion data in {n_batches} batches of {BATCH_SIZE}...")

    all_results: dict[str, dict[str, float]] = {}

    for batch_num in range(n_batches):
        start = batch_num * BATCH_SIZE
        batch = communes[start : start + BATCH_SIZE]
        idx_strs = [c[0] for c in batch]
        bfs_nums = [c[1] for c in batch]

        print(f"  Batch {batch_num + 1}/{n_batches} ({len(batch)} communes)...")
        values = fetch_batch(idx_strs)
        pcts = compute_religion_pcts(values, len(batch))

        skipped = 0
        for bfs, result in zip(bfs_nums, pcts):
            if result is None:
                skipped += 1
                continue
            all_results[str(bfs)] = result

        if skipped:
            print(f"    Skipped {skipped} communes with total=0")

        if batch_num < n_batches - 1:
            time.sleep(SLEEP_BETWEEN_BATCHES)

    output = {
        "meta": {
            "source": "BFS Volkszählung 2000",
            "year": 2000,
            "url": API_BASE,
            "note": (
                "2000 census data only. Post-2000 Strukturerhebung is a sample survey "
                "representative only at canton level for most communes."
            ),
        },
        "communes": dict(sorted(all_results.items(), key=lambda kv: int(kv[0]))),
    }

    out_path.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")))
    size_kb = out_path.stat().st_size / 1024
    print(f"  Written {out_path.relative_to(ROOT)} ({size_kb:.0f} KB)")
    print(f"  {len(all_results)} communes with religion data")


if __name__ == "__main__":
    main()
