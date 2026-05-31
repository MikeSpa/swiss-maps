"""
Downloads votation JSON files.

Usage:
  uv run python scripts/download_votations.py                   # refresh all in index
  uv run python scripts/download_votations.py --add 20260914   # add one date
  uv run python scripts/download_votations.py --backfill 2020  # add all dates from CKAN >= year
  uv run python scripts/download_votations.py --force          # re-download existing files
"""

import argparse
import json
import re
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).parent.parent.parent
INDEX_FILE = ROOT / "public" / "votations" / "index.json"
OUT_DIR = ROOT / "public" / "votations"

CKAN_PACKAGE_URL = (
    "https://opendata.swiss/api/3/action/package_show"
    "?id=echtzeitdaten-am-abstimmungstag-zu-eidgenoessischen-abstimmungsvorlagen"
)
FALLBACK_URL_PATTERN = (
    "https://ogd-static.voteinfo-app.ch/v1/ogd/sd-t-17-02-{date}-eidgAbstimmung.json"
)


def fetch_ckan_dates(since_year: int) -> list[dict]:
    """Return list of {date, source_url} from CKAN for dates >= since_year."""
    print("Querying CKAN for available votation dates…")
    resp = requests.get(CKAN_PACKAGE_URL, headers={"User-Agent": "swiss-maps/1.0"}, timeout=20)
    resp.raise_for_status()
    resources = resp.json()["result"]["resources"]

    results = []
    for r in resources:
        name = r.get("name", "")
        if isinstance(name, dict):
            name = name.get("de", "")
        url = r.get("url", "")
        # Extract date from name like "Volksabstimmung vom 08.03.2026"
        m = re.search(r"(\d{2})\.(\d{2})\.(\d{4})", name)
        if not m:
            continue
        dd, mm, yyyy = m.groups()
        if int(yyyy) < since_year:
            continue
        date = f"{yyyy}{mm}{dd}"
        results.append({"date": date, "source_url": url})

    results.sort(key=lambda x: x["date"], reverse=True)
    print(f"  Found {len(results)} dates from {since_year}+")
    return results


def load_index() -> list[dict]:
    return json.loads(INDEX_FILE.read_text()) if INDEX_FILE.exists() else []


def save_index(index: list[dict]) -> None:
    index.sort(key=lambda e: e["date"], reverse=True)
    INDEX_FILE.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n")


def make_entry(date: str, source_url: str | None = None) -> dict:
    label = f"{date[6:8]}.{date[4:6]}.{date[:4]}"
    entry: dict = {"date": date, "label": label, "file": f"/votations/{date}.json"}
    if source_url:
        entry["source_url"] = source_url
    return entry


def resolve_url(date: str, source_url: str | None) -> str:
    """Use stored source_url if available, fall back to the ogd-static pattern."""
    if source_url:
        return source_url
    return FALLBACK_URL_PATTERN.format(date=date)


def download(date: str, source_url: str | None, force: bool = False) -> bool:
    dest = OUT_DIR / f"{date}.json"
    if dest.exists() and not force:
        print(f"  {date}.json already exists (--force to re-download)")
        return False
    url = resolve_url(date, source_url)
    print(f"  Downloading {url}")
    resp = requests.get(url, headers={"User-Agent": "swiss-maps/1.0"}, timeout=60)
    resp.raise_for_status()
    dest.write_bytes(resp.content)
    print(f"  Saved {dest.name} ({dest.stat().st_size // 1024} KB)")
    return True


def add_to_index(date: str, source_url: str | None) -> None:
    index = load_index()
    existing = next((e for e in index if e["date"] == date), None)
    if existing:
        # Update source_url if we now have one
        if source_url and not existing.get("source_url"):
            existing["source_url"] = source_url
            save_index(index)
            print(f"  Updated source_url for {date} in index.json")
        else:
            print(f"  {date} already in index.json")
        return
    index.append(make_entry(date, source_url))
    save_index(index)
    print(f"  Added {date} to index.json")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--add", metavar="DATE", help="Add a new votation date (YYYYMMDD)")
    parser.add_argument(
        "--backfill", metavar="YEAR", type=int,
        help="Add all dates from CKAN for the given year onwards",
    )
    parser.add_argument("--force", action="store_true", help="Re-download existing files")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if args.add:
        print(f"Adding {args.add}:")
        download(args.add, source_url=None, force=args.force)
        add_to_index(args.add, source_url=None)
        return

    if args.backfill:
        ckan_dates = fetch_ckan_dates(args.backfill)
        print(f"\nDownloading {len(ckan_dates)} votation date(s) from {args.backfill}+:")
        for entry in ckan_dates:
            date, url = entry["date"], entry["source_url"]
            print(f"\n{date}:")
            download(date, url, force=args.force)
            add_to_index(date, url)
        return

    # Default: refresh all in index
    index = load_index()
    if not index:
        print("No votations in index.json. Use --add YYYYMMDD or --backfill YEAR.")
        sys.exit(1)

    print(f"Downloading {len(index)} votation(s):")
    for entry in index:
        download(entry["date"], entry.get("source_url"), force=args.force)


if __name__ == "__main__":
    main()
