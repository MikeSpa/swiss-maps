"""
Downloads votation JSON files listed in public/votations/index.json.
Run this to refresh data or add new votation dates.

Usage:
  uv run python scripts/download_votations.py
  uv run python scripts/download_votations.py --add 20260914  # add a new date
"""

import argparse
import json
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).parent.parent.parent
INDEX_FILE = ROOT / "public" / "votations" / "index.json"
OUT_DIR = ROOT / "public" / "votations"

BASE_URL = "https://ogd-static.voteinfo-app.ch/v1/ogd"


def file_url(date: str) -> str:
    return f"{BASE_URL}/sd-t-17-02-{date}-eidgAbstimmung.json"


def download(date: str, force: bool = False) -> None:
    dest = OUT_DIR / f"{date}.json"
    if dest.exists() and not force:
        print(f"  {date}.json already exists (use --force to re-download)")
        return
    url = file_url(date)
    print(f"  Downloading {url}")
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    dest.write_bytes(resp.content)
    print(f"  Saved {dest.name} ({dest.stat().st_size / 1024:.0f} KB)")


def add_to_index(date: str) -> None:
    index = json.loads(INDEX_FILE.read_text()) if INDEX_FILE.exists() else []
    if any(e["date"] == date for e in index):
        print(f"  {date} already in index")
        return
    label = f"{date[6:8]}.{date[4:6]}.{date[:4]}"
    index.insert(0, {"date": date, "label": label, "file": f"/votations/{date}.json"})
    # Sort descending by date
    index.sort(key=lambda e: e["date"], reverse=True)
    INDEX_FILE.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n")
    print(f"  Added {date} to index.json")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--add", metavar="DATE", help="Add a new votation date (YYYYMMDD)")
    parser.add_argument("--force", action="store_true", help="Re-download existing files")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if args.add:
        print(f"Adding {args.add}:")
        download(args.add, force=args.force)
        add_to_index(args.add)
        return

    # Refresh all in index
    index = json.loads(INDEX_FILE.read_text()) if INDEX_FILE.exists() else []
    if not index:
        print("No votations in index.json. Use --add YYYYMMDD to add one.")
        sys.exit(1)

    print(f"Downloading {len(index)} votation(s):")
    for entry in index:
        download(entry["date"], force=args.force)


if __name__ == "__main__":
    main()
