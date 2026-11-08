#!/usr/bin/env python3
"""
Aggregate SwissImpex TN8_VK CSV files into per-country sector breakdown.

Input:  dev_scripts/trade/TN8_VK_EXP_en_v1.csv
        dev_scripts/trade/TN8_VK_IMP_en_v1.csv
Output: public/trade/sectors_by_country.json

Columns used: year, Country_isoAlpha2, Tariffnumber8 (first 2 chars = HS chapter), Value_CHF
We use year=2025 (full 12 months available).

HS chapter → sector mapping based on Swiss export structure.
"""

import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT   = Path(__file__).resolve().parents[2]
EXP_CSV = ROOT / "dev_scripts" / "trade" / "TN8_VK_EXP_en_v1.csv"
IMP_CSV = ROOT / "dev_scripts" / "trade" / "TN8_VK_IMP_en_v1.csv"
OUT_FILE = ROOT / "public" / "trade" / "sectors_by_country.json"

YEAR = "2025"

# HS chapter (2-digit) → sector code
# Chapters not listed → "OTHER"
HS_TO_SECTOR: dict[str, str] = {
    # Agriculture & forestry
    **{c: "AGRI" for c in ["01","02","03","04","05","06","07","08","09",
                            "10","11","12","13","14","15","16","17","18",
                            "19","20","21","22","23","24"]},
    # Energy
    "27": "ENERGY",
    # Chemical & pharma
    "28": "CHEM_PHARMA",
    "29": "CHEM_PHARMA",
    "30": "CHEM_PHARMA",
    "31": "CHEM_PHARMA",
    "32": "CHEM_PHARMA",
    "33": "CHEM_PHARMA",
    "34": "CHEM_PHARMA",
    "35": "CHEM_PHARMA",
    "36": "CHEM_PHARMA",
    "37": "CHEM_PHARMA",
    "38": "CHEM_PHARMA",
    # Plastics / rubber — keep as OTHER (small share)
    # Textiles & clothing
    **{c: "TEXTILES" for c in ["50","51","52","53","54","55","56","57","58",
                                "59","60","61","62","63","64","65","66","67"]},
    # Precious metals, gems, jewellery — excluded from business-cycle total, skip
    # "71": "PRECIOUS",
    # Metals
    **{c: "METALS" for c in ["72","73","74","75","76","77","78","79","80",
                              "81","82","83"]},
    # Machines & electronics
    "84": "MACHINES_ELEC",
    "85": "MACHINES_ELEC",
    # Vehicles
    "86": "VEHICLES",
    "87": "VEHICLES",
    "88": "VEHICLES",
    "89": "VEHICLES",
    # Precision, optical, medtech
    "90": "PRECISION",
    # Watches & clocks
    "91": "WATCHES",
}

SECTOR_LABELS: dict[str, str] = {
    "CHEM_PHARMA":   "Chemical & pharma",
    "MACHINES_ELEC": "Machines & electronics",
    "WATCHES":       "Watches & clocks",
    "PRECISION":     "Precision & medtech",
    "METALS":        "Metals",
    "PRECIOUS":      "Precious metals & gems",
    "VEHICLES":      "Vehicles",
    "TEXTILES":      "Textiles & clothing",
    "AGRI":          "Agriculture & forestry",
    "ENERGY":        "Energy",
    "OTHER":         "Other",
}


def aggregate(csv_path: Path, direction: str) -> dict[str, dict[str, float]]:
    """Return {country_iso2: {sector_code: value_CHF}} for the target year."""
    totals: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    rows_used = 0
    rows_skipped = 0

    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            if row["year"] != YEAR:
                continue
            country = row["Country_isoAlpha2"].strip()
            tn8     = row["Tariffnumber8"].strip()
            val_str = row["Value_CHF"].strip()

            if not country or not tn8 or not val_str:
                rows_skipped += 1
                continue

            try:
                val = float(val_str)
            except ValueError:
                rows_skipped += 1
                continue

            chapter = tn8[:2]
            if chapter == "71":   # precious metals/gems — excluded to match business-cycle total
                continue
            sector  = HS_TO_SECTOR.get(chapter, "OTHER")
            totals[country][sector] += val
            rows_used += 1

    print(f"  {direction}: {rows_used:,} rows aggregated, {rows_skipped} skipped")
    print(f"  {direction}: {len(totals)} countries found")
    return {c: dict(s) for c, s in totals.items()}


def to_sector_list(country_totals: dict[str, float]) -> list[dict]:
    """Convert {sector_code: CHF} to sorted list with shares, in CHF millions."""
    grand_total = sum(country_totals.values())
    if grand_total == 0:
        return []
    items = []
    for sector_code, label in SECTOR_LABELS.items():
        val_chf = country_totals.get(sector_code, 0.0)
        if val_chf == 0:
            continue
        items.append({
            "sector_code": sector_code,
            "sector": label,
            "value_CHF_millions": round(val_chf / 1_000_000, 1),
            "share_pct": round(val_chf / grand_total * 100, 1),
        })
    items.sort(key=lambda x: -x["value_CHF_millions"])
    return items


def main() -> None:
    print(f"=== Trade sector aggregation (year={YEAR}) ===\n")

    print("1. Aggregating exports...")
    exp = aggregate(EXP_CSV, "EXP")

    print("\n2. Aggregating imports...")
    imp = aggregate(IMP_CSV, "IMP")

    print("\n3. Building per-country sector output...")
    all_countries = sorted(set(exp) | set(imp))
    out: dict[str, dict] = {}

    for iso2 in all_countries:
        exp_sectors = to_sector_list(exp.get(iso2, {}))
        imp_sectors = to_sector_list(imp.get(iso2, {}))
        if not exp_sectors and not imp_sectors:
            continue
        out[iso2] = {
            "exports": exp_sectors,
            "imports": imp_sectors,
        }

    print(f"   {len(out)} countries with sector data")

    # Print top-5 countries by export volume to verify
    exp_totals = {c: sum(exp.get(c, {}).values()) for c in all_countries}
    top5 = sorted(exp_totals.items(), key=lambda x: -x[1])[:5]
    print("\n   Top 5 export destinations:")
    for iso2, val in top5:
        top_sector = max(exp.get(iso2, {}).items(), key=lambda x: x[1], default=("?", 0))
        print(f"   {iso2}: CHF {val/1e9:.1f}B  (top sector: {top_sector[0]})")

    result = {
        "metadata": {
            "source": "BAZG SwissImpex TN8_VK",
            "year": int(YEAR),
            "note": "HS8 tariff number aggregated to sector level. Chapter 71 (precious metals, gems) excluded to match business-cycle total.",
        },
        "by_country": out,
    }

    OUT_FILE.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
    size_kb = OUT_FILE.stat().st_size // 1024
    print(f"\n✓ Written to {OUT_FILE} ({size_kb}KB)")


if __name__ == "__main__":
    main()
