"""
Downloads ESTV federal direct tax statistics for natural persons by municipality
(tax year 2022) and outputs median/average taxable income per commune as
public/demographics/income.json.

Source: ESTV (Federal Tax Administration) — Statistik der direkten Bundessteuer,
natürliche Personen, Gemeinden, Steuerjahr 2022
https://www.estv.admin.ch/estv/de/home/die-estv/steuerstatistiken-estv/allgemeine-steuerstatistiken/direkte-bundessteuer/dbst-np-gemeinden-ab-1983.html
File: statistik-dbst-np-gden-2022-normalfall.xlsx
URL:  https://www.estv.admin.ch/dam/de/sd-web/wum7OKVNOOwl/statistik-dbst-np-gden-2022-normalfall.xlsx

Sheets used:
  "521" — number of taxpayers per "steuerbares Einkommen" (taxable income) bracket
  "523" — sum of taxable income (CHF) per same bracket

Both sheets share the row layout: Kanton ID, Kanton, Gemeinde ID (= BFS commune
number), Gemeinde, then 10 bracket columns (0, 1-30k, 30k-40k, ..., >1M), then
Total. "- " marks values withheld for privacy/tax-secrecy reasons (treated as 0).
Rows with Gemeinde ID 10000 are canton/national subtotal rows and are skipped.

Output indicators per commune:
  avg_taxable_income_chf    — sum(523 total) / sum(521 total)
  median_taxable_income_chf — interpolated within the bracket containing the
                               50th-percentile taxpayer (linear interpolation,
                               assuming uniform distribution within the bracket)

Usage:
  uv run python scripts/download_income.py
  uv run python scripts/download_income.py --force   # re-download the xlsx
"""

import argparse
import json
from pathlib import Path

import openpyxl
import requests

ROOT = Path(__file__).parent.parent.parent
OUT_DIR = ROOT / "public" / "demographics"
CACHE_XLSX = OUT_DIR / "_estv_income_2022.xlsx"

XLSX_URL = "https://www.estv.admin.ch/dam/de/sd-web/wum7OKVNOOwl/statistik-dbst-np-gden-2022-normalfall.xlsx"

# (lower, upper) bounds in CHF for each bracket column, in sheet order.
# The last bracket is open-ended; capped at 2,000,000 for interpolation purposes.
BRACKETS: list[tuple[float, float]] = [
    (0, 0),
    (1, 30_000),
    (30_001, 40_000),
    (40_001, 50_000),
    (50_001, 75_000),
    (75_001, 100_000),
    (100_001, 200_000),
    (200_001, 500_000),
    (500_001, 1_000_000),
    (1_000_001, 2_000_000),
]
N_BRACKETS = len(BRACKETS)


# ── Download ───────────────────────────────────────────────────────────────────

def download_xlsx(force: bool = False) -> Path:
    if CACHE_XLSX.exists() and not force:
        print(f"  xlsx already cached ({CACHE_XLSX.name}) — use --force to re-download")
        return CACHE_XLSX
    print(f"  Downloading {XLSX_URL}")
    resp = requests.get(XLSX_URL, timeout=120, headers={"User-Agent": "swiss-maps-pipeline/1.0"})
    resp.raise_for_status()
    CACHE_XLSX.write_bytes(resp.content)
    print(f"  Saved {CACHE_XLSX.name} ({CACHE_XLSX.stat().st_size / 1024:.0f} KB)")
    return CACHE_XLSX


# ── Parse ──────────────────────────────────────────────────────────────────────

def parse_sheet(wb: openpyxl.Workbook, sheet: str) -> dict[int, list[float]]:
    """Return {bfs_nummer: [bracket0_value, ..., bracketN_value]} (Total column excluded)."""
    ws = wb[sheet]
    rows = ws.iter_rows(values_only=True)
    next(rows)  # title row
    next(rows)  # privacy note row
    next(rows)  # header row

    result: dict[int, list[float]] = {}
    for row in rows:
        try:
            bfs = int(row[2])
        except (TypeError, ValueError):
            continue
        if bfs == 10000:
            continue  # canton/national subtotal row

        values = [v if isinstance(v, (int, float)) else 0 for v in row[4 : 4 + N_BRACKETS]]
        result[bfs] = values

    return result


def compute_income(
    counts: dict[int, list[float]],
    sums: dict[int, list[float]],
) -> dict[str, dict[str, float]]:
    """Compute avg and median taxable income per commune."""
    output: dict[str, dict[str, float]] = {}

    for bfs, count_brackets in counts.items():
        total_count = sum(count_brackets)
        if total_count <= 0:
            continue

        sum_brackets = sums.get(bfs)
        total_sum = sum(sum_brackets) if sum_brackets else 0

        avg = total_sum / total_count

        target = total_count / 2
        cumulative = 0.0
        median = BRACKETS[-1][0]
        for (lower, upper), count in zip(BRACKETS, count_brackets):
            if cumulative + count >= target and count > 0:
                frac = (target - cumulative) / count
                median = lower + frac * (upper - lower)
                break
            cumulative += count

        output[str(bfs)] = {
            "avg_taxable_income_chf": round(avg, 0),
            "median_taxable_income_chf": round(median, 0),
        }

    return output


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Download ESTV 2022 municipality taxable income statistics."
    )
    parser.add_argument("--force", action="store_true", help="Re-download the xlsx")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Downloading ESTV income statistics...")
    xlsx_path = download_xlsx(force=args.force)

    print("Parsing sheets 521 (counts) and 523 (sums)...")
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    counts = parse_sheet(wb, "521")
    sums = parse_sheet(wb, "523")
    print(f"  {len(counts)} communes")

    print("Computing average and median taxable income...")
    communes = compute_income(counts, sums)

    output = {
        "meta": {
            "source": "ESTV Statistik der direkten Bundessteuer, natürliche Personen, Gemeinden",
            "year": 2022,
            "url": XLSX_URL,
            "note": (
                "median_taxable_income_chf is linearly interpolated within the income "
                "bracket containing the 50th-percentile taxpayer. avg_taxable_income_chf "
                "is the arithmetic mean (sum of taxable income / number of taxpayers)."
            ),
        },
        "communes": dict(sorted(communes.items(), key=lambda kv: int(kv[0]))),
    }

    out_path = OUT_DIR / "income.json"
    out_path.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")))
    size_kb = out_path.stat().st_size / 1024
    print(f"  Written {out_path.relative_to(ROOT)} ({size_kb:.0f} KB)")
    print(f"  {len(communes)} communes with income data")


if __name__ == "__main__":
    main()
