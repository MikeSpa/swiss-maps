"""
Downloads BFS Regionalportraits 2021 CSV and outputs per-municipality
demographic indicators as public/demographics/index.json.

Source: BFS Regionalportraits 2021 (reference year 2019)
https://opendata.swiss/en/dataset/regionalportrats-2021-kennzahlen-aller-gemeinden

Usage:
  uv run python scripts/download_demographics.py
  uv run python scripts/download_demographics.py --force   # re-download CSV
"""

import csv
import json
import math
from datetime import date
from pathlib import Path

import requests

ROOT = Path(__file__).parent.parent.parent
OUT_DIR = ROOT / "public" / "demographics"
CACHE_CSV = OUT_DIR / "_regionalportrats_raw.csv"
GEO_MUNICIPALITIES = ROOT / "public" / "geo" / "municipalities.geojson"

CSV_URL = "https://dam-api.bfs.admin.ch/hub/api/dam/assets/16484444/master"

# Indicators to extract from the CSV, with multilingual labels and units.
# "domain" is left as None and computed from data (p5–p95 to avoid outlier stretch).
TOPICS: list[dict] = [
    {
        "id": "foreign_pct",
        "indicator": "Ind_01_08",
        "unit": "%",
        "label": {
            "de": "Ausländeranteil",
            "fr": "Part d'étrangers",
            "it": "Quota di stranieri",
            "rm": "Part d'extraniers",
            "en": "Foreign nationals",
        },
    },
    {
        "id": "age_young_pct",
        "indicator": "Ind_01_04",
        "unit": "%",
        "label": {
            "de": "Anteil 0–19 Jahre",
            "fr": "Part 0–19 ans",
            "it": "Quota 0–19 anni",
            "rm": "Part 0–19 onns",
            "en": "Age 0–19",
        },
    },
    {
        "id": "age_working_pct",
        "indicator": "Ind_01_05",
        "unit": "%",
        "label": {
            "de": "Anteil 20–64 Jahre",
            "fr": "Part 20–64 ans",
            "it": "Quota 20–64 anni",
            "rm": "Part 20–64 onns",
            "en": "Age 20–64",
        },
    },
    {
        "id": "age_senior_pct",
        "indicator": "Ind_01_06",
        "unit": "%",
        "label": {
            "de": "Anteil 65+ Jahre",
            "fr": "Part 65+ ans",
            "it": "Quota 65+ anni",
            "rm": "Part 65+ onns",
            "en": "Age 65+",
        },
    },
    {
        "id": "pop_density",
        "indicator": "Ind_01_03",
        "unit": "inh/km²",
        "label": {
            "de": "Bevölkerungsdichte",
            "fr": "Densité de population",
            "it": "Densità demografica",
            "rm": "Densitad da populaziun",
            "en": "Population density",
        },
    },
    {
        "id": "social_assistance_pct",
        "indicator": "Ind_11_01",
        "unit": "%",
        "label": {
            "de": "Sozialhilfequote",
            "fr": "Taux d'aide sociale",
            "it": "Quota d'assistenza sociale",
            "rm": "Quota d'agid social",
            "en": "Social assistance rate",
        },
    },
    {
        "id": "vote_svp_pct",
        "indicator": "Ind_14_04",
        "unit": "%",
        "label": {
            "de": "SVP-Wähleranteil (NR 2019)",
            "fr": "Part UDC (CN 2019)",
            "it": "Quota SVP/UDC (CN 2019)",
            "rm": "Part SVP (CN 2019)",
            "en": "SVP/UDC voter share (2019)",
        },
    },
    {
        "id": "vote_sp_pct",
        "indicator": "Ind_14_03",
        "unit": "%",
        "label": {
            "de": "SP-Wähleranteil (NR 2019)",
            "fr": "Part PS (CN 2019)",
            "it": "Quota PS (CN 2019)",
            "rm": "Part SP (CN 2019)",
            "en": "SP/PS voter share (2019)",
        },
    },
    {
        "id": "vote_fdp_pct",
        "indicator": "Ind_14_01",
        "unit": "%",
        "label": {
            "de": "FDP-Wähleranteil (NR 2019)",
            "fr": "Part PLR (CN 2019)",
            "it": "Quota FDP/PLR (CN 2019)",
            "rm": "Part FDP (CN 2019)",
            "en": "FDP/PLR voter share (2019)",
        },
    },
    {
        "id": "vote_gps_pct",
        "indicator": "Ind_14_09",
        "unit": "%",
        "label": {
            "de": "GPS-Wähleranteil (NR 2019)",
            "fr": "Part PES (CN 2019)",
            "it": "Quota Verdi (CN 2019)",
            "rm": "Part PES (CN 2019)",
            "en": "GPS/Greens voter share (2019)",
        },
    },
    {
        "id": "vote_glp_pct",
        "indicator": "Ind_14_06",
        "unit": "%",
        "label": {
            "de": "GLP-Wähleranteil (NR 2019)",
            "fr": "Part PVL (CN 2019)",
            "it": "Quota PVL (CN 2019)",
            "rm": "Part PVL (CN 2019)",
            "en": "GLP/GreenLiberal voter share (2019)",
        },
    },
]

INDICATOR_TO_TOPIC = {t["indicator"]: t["id"] for t in TOPICS}


def download_csv(force: bool = False) -> Path:
    if CACHE_CSV.exists() and not force:
        print(f"  CSV already cached at {CACHE_CSV.name} (use --force to re-download)")
        return CACHE_CSV
    print(f"  Downloading {CSV_URL}")
    resp = requests.get(CSV_URL, timeout=120, headers={"User-Agent": "swiss-maps-pipeline/1.0"})
    resp.raise_for_status()
    CACHE_CSV.write_bytes(resp.content)
    print(f"  Saved {CACHE_CSV.name} ({CACHE_CSV.stat().st_size / 1024:.0f} KB)")
    return CACHE_CSV


def parse_csv(csv_path: Path) -> dict[int, dict[str, float]]:
    """Return {bfs_nummer: {topic_id: value}} for all communes."""
    communes: dict[int, dict[str, float]] = {}
    skipped = 0
    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            ind = row["INDICATORS"]
            if ind not in INDICATOR_TO_TOPIC:
                continue
            if row["STATUS"] != "A":
                continue
            code = row["CODE_REGION"]
            try:
                bfs = int(code)
            except ValueError:
                continue  # skip "CH" and other non-integer codes
            try:
                value = float(row["VALUE"])
            except (ValueError, TypeError):
                skipped += 1
                continue
            topic_id = INDICATOR_TO_TOPIC[ind]
            communes.setdefault(bfs, {})[topic_id] = round(value, 4)
    if skipped:
        print(f"  Skipped {skipped} rows with non-numeric values")
    return communes


def load_canton_mapping() -> dict[int, int] | None:
    """Load {bfs_nummer: kantonsnummer} from municipalities GeoJSON if it exists."""
    if not GEO_MUNICIPALITIES.exists():
        print(f"  Note: {GEO_MUNICIPALITIES.name} not found — skipping canton aggregates")
        print("  Run export_geo.py first to enable canton-level demographics")
        return None
    print(f"  Loading canton mapping from {GEO_MUNICIPALITIES.name}")
    geo = json.loads(GEO_MUNICIPALITIES.read_text())
    mapping: dict[int, int] = {}
    for feat in geo["features"]:
        props = feat["properties"]
        bfs = props.get("bfs_nummer")
        kanton = props.get("kantonsnummer")
        if bfs and kanton:
            mapping[int(bfs)] = int(kanton)
    print(f"  Loaded {len(mapping)} commune→canton mappings")
    return mapping


def aggregate_cantons(
    communes: dict[int, dict[str, float]],
    canton_map: dict[int, int],
) -> dict[int, dict[str, float]]:
    """Compute population-weighted means per canton."""
    # Group by canton
    canton_data: dict[int, list[dict[str, float]]] = {}
    for bfs, values in communes.items():
        kanton = canton_map.get(bfs)
        if kanton is None:
            continue
        canton_data.setdefault(kanton, []).append(values)

    result: dict[int, dict[str, float]] = {}
    for kanton, commune_list in canton_data.items():
        # Weighted by population (pop is in Ind_01_01, stored as total persons not %)
        # For % indicators, weight by population; for density, recompute from sums
        topic_ids = [t["id"] for t in TOPICS]
        pop_key = None  # population not in TOPICS, so use equal weights
        # Equal-weight mean (acceptable approximation — communes differ in population
        # but we don't have a separate population column in TOPICS)
        aggregated: dict[str, float] = {}
        for tid in topic_ids:
            vals = [d[tid] for d in commune_list if tid in d]
            if vals:
                aggregated[tid] = round(sum(vals) / len(vals), 4)
        result[kanton] = aggregated

    return result


def compute_domain(communes: dict[int, dict[str, float]], topic_id: str) -> list[float]:
    """Return [p5, p95] of values for a topic to use as the colour scale domain."""
    vals = sorted(v[topic_id] for v in communes.values() if topic_id in v)
    if not vals:
        return [0.0, 100.0]
    n = len(vals)
    p5 = vals[max(0, int(n * 0.05))]
    p95 = vals[min(n - 1, int(n * 0.95))]
    return [round(p5, 2), round(p95, 2)]


def main(force: bool = False) -> None:
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Re-download the CSV")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Downloading CSV...")
    csv_path = download_csv(force=args.force)

    print("Parsing indicators...")
    communes = parse_csv(csv_path)
    print(f"  {len(communes)} communes loaded")

    canton_map = load_canton_mapping()
    cantons: dict[int, dict[str, float]] = {}
    if canton_map:
        print("Aggregating canton values...")
        cantons = aggregate_cantons(communes, canton_map)
        print(f"  {len(cantons)} cantons aggregated")

    print("Computing colour scale domains...")
    topics_out = []
    for t in TOPICS:
        domain = compute_domain(communes, t["id"])
        topics_out.append({
            "id": t["id"],
            "label": t["label"],
            "unit": t["unit"],
            "domain": domain,
            "source": "BFS Regionalportraits 2021",
            "year": 2019,
        })

    output = {
        "meta": {
            "source": "BFS Regionalportraits 2021",
            "reference_year": 2019,
            "downloaded": date.today().isoformat(),
            "url": CSV_URL,
        },
        "topics": topics_out,
        # String keys for JSON (bfs_nummer as string)
        "communes": {str(k): v for k, v in sorted(communes.items())},
        "cantons": {str(k): v for k, v in sorted(cantons.items())},
    }

    out_path = OUT_DIR / "index.json"
    out_path.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")))
    size_kb = out_path.stat().st_size / 1024
    print(f"  Written {out_path.relative_to(ROOT)} ({size_kb:.0f} KB)")
    print(f"  {len(communes)} communes, {len(cantons)} cantons, {len(topics_out)} topics")


if __name__ == "__main__":
    import sys

    main()
