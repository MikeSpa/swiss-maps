"""
Downloads BFS Regionalportraits 2021 CSV and outputs per-municipality
demographic indicators as public/demographics/index.json.

Source: BFS Regionalportraits 2021 (reference year 2019)
https://opendata.swiss/en/dataset/regionalportrats-2021-kennzahlen-aller-gemeinden

Usage:
  uv run python scripts/download_demographics.py
  uv run python scripts/download_demographics.py --force   # re-download CSV
"""

import argparse
import csv
import json
from datetime import date
from pathlib import Path

import requests

ROOT = Path(__file__).parent.parent.parent
OUT_DIR = ROOT / "public" / "demographics"
CACHE_CSV = OUT_DIR / "_regionalportrats_raw.csv"
GEO_MUNICIPALITIES = ROOT / "public" / "geo" / "municipalities.geojson"

CSV_URL = "https://dam-api.bfs.admin.ch/hub/api/dam/assets/16484444/master"

NO_DATA = -9999  # sentinel stored in JSON for missing values

# ── Groups ────────────────────────────────────────────────────────────────────

GROUPS: list[dict] = [
    {"id": "context",    "label": {"de": "Kontext", "fr": "Contexte", "it": "Contesto", "rm": "Context", "en": "Context"}},
    {"id": "population", "label": {"de": "Bevölkerung", "fr": "Population", "it": "Popolazione", "rm": "Populaziun", "en": "Population"}},
    {"id": "age",        "label": {"de": "Alter", "fr": "Âge", "it": "Età", "rm": "Vegliadetgna", "en": "Age"}},
    {"id": "vital",      "label": {"de": "Demographische Ereignisse", "fr": "Événements démographiques", "it": "Eventi demografici", "rm": "Eveniments demografics", "en": "Vital statistics"}},
    {"id": "land",       "label": {"de": "Fläche", "fr": "Surface", "it": "Superficie", "rm": "Surfatscha", "en": "Land use"}},
    {"id": "economy",    "label": {"de": "Wirtschaft", "fr": "Économie", "it": "Economia", "rm": "Economia", "en": "Economy"}},
    {"id": "housing",    "label": {"de": "Wohnen", "fr": "Logement", "it": "Abitazioni", "rm": "Abitaziuns", "en": "Housing"}},
    {"id": "social",     "label": {"de": "Soziales", "fr": "Social", "it": "Sociale", "rm": "Social", "en": "Social"}},
    {"id": "language",   "label": {"de": "Sprache", "fr": "Langue", "it": "Lingua", "rm": "Lingua", "en": "Language"}},
    {"id": "religion",   "label": {"de": "Religion (Volkszählung 2000)", "fr": "Religion (recensement 2000)", "it": "Religione (censimento 2000)", "rm": "Religiun (census 2000)", "en": "Religion (2000 census)"}},
    {"id": "politics",   "label": {"de": "Politik (NR-Wahlen 2019)", "fr": "Politique (CN 2019)", "it": "Politica (CN 2019)", "rm": "Politica (CN 2019)", "en": "Politics (2019 elections)"}},
]

TYPOLOGY_CATEGORIES = {
    "1": {"de": "Städtisch", "fr": "Urbain", "it": "Urbano", "rm": "Urban", "en": "Urban"},
    "2": {"de": "Periurban", "fr": "Périurbain", "it": "Periurbano", "rm": "Periurban", "en": "Periurban"},
    "3": {"de": "Ländlich", "fr": "Rural", "it": "Rurale", "rm": "Rural", "en": "Rural"},
}

LANGUAGE_REGION_CATEGORIES = {
    "1": {"de": "Deutsch", "fr": "Allemand", "it": "Tedesco", "rm": "Tudestg", "en": "German"},
    "2": {"de": "Französisch", "fr": "Français", "it": "Francese", "rm": "Franzos", "en": "French"},
    "3": {"de": "Italienisch", "fr": "Italien", "it": "Italiano", "rm": "Talian", "en": "Italian"},
    "4": {"de": "Rätoromanisch", "fr": "Romanche", "it": "Romancio", "rm": "Rumantsch", "en": "Romansh"},
}

# ── Direct indicators (read straight from the CSV) ────────────────────────────

TOPICS: list[dict] = [
    # population
    {
        "id": "foreign_pct", "indicator": "Ind_01_08", "group": "population", "unit": "%",
        "label": {"de": "Ausländeranteil", "fr": "Part d'étrangers", "it": "Quota di stranieri", "rm": "Part d'extraniers", "en": "Foreign nationals"},
    },
    {
        "id": "pop_change_pct", "indicator": "Ind_01_02", "group": "population", "unit": "%",
        "label": {"de": "Bevölkerungswachstum", "fr": "Croissance démographique", "it": "Crescita demografica", "rm": "Creschida da populaziun", "en": "Population growth"},
    },
    {
        "id": "pop_density", "indicator": "Ind_01_03", "group": "population", "unit": "inh/km²",
        "label": {"de": "Bevölkerungsdichte", "fr": "Densité de population", "it": "Densità demografica", "rm": "Densitad da populaziun", "en": "Population density"},
    },
    {
        "id": "household_size", "indicator": "Ind_01_14", "group": "population", "unit": "persons",
        "label": {"de": "Durchschnittliche Haushaltsgrösse", "fr": "Taille moyenne des ménages", "it": "Grandezza media delle economie dom.", "rm": "Grondezza media da la famiglia", "en": "Average household size"},
    },
    # age
    {
        "id": "age_young_pct", "indicator": "Ind_01_04", "group": "age", "unit": "%",
        "label": {"de": "Anteil 0–19 Jahre", "fr": "Part 0–19 ans", "it": "Quota 0–19 anni", "rm": "Part 0–19 onns", "en": "Age 0–19"},
    },
    {
        "id": "age_working_pct", "indicator": "Ind_01_05", "group": "age", "unit": "%",
        "label": {"de": "Anteil 20–64 Jahre", "fr": "Part 20–64 ans", "it": "Quota 20–64 anni", "rm": "Part 20–64 onns", "en": "Age 20–64"},
    },
    {
        "id": "age_senior_pct", "indicator": "Ind_01_06", "group": "age", "unit": "%",
        "label": {"de": "Anteil 65+ Jahre", "fr": "Part 65+ ans", "it": "Quota 65+ anni", "rm": "Part 65+ onns", "en": "Age 65+"},
    },
    # vital
    {
        "id": "birth_rate", "indicator": "Ind_01_11", "group": "vital", "unit": "‰",
        "label": {"de": "Geburtenziffer", "fr": "Taux de natalité", "it": "Tasso di natalità", "rm": "Taux da naschientscha", "en": "Birth rate"},
    },
    {
        "id": "death_rate", "indicator": "Ind_01_12", "group": "vital", "unit": "‰",
        "label": {"de": "Sterbeziffer", "fr": "Taux de mortalité", "it": "Tasso di mortalità", "rm": "Taux da mortalitad", "en": "Death rate"},
    },
    {
        "id": "marriage_rate", "indicator": "Ind_01_09", "group": "vital", "unit": "‰",
        "label": {"de": "Heiratsziffer", "fr": "Taux de nuptialité", "it": "Tasso di nuzialità", "rm": "Taux da matrimbonns", "en": "Marriage rate"},
    },
    {
        "id": "divorce_rate", "indicator": "Ind_01_10", "group": "vital", "unit": "‰",
        "label": {"de": "Scheidungsziffer", "fr": "Taux de divortialité", "it": "Tasso di divorzialità", "rm": "Taux da divorcis", "en": "Divorce rate"},
    },
    # land
    {
        "id": "settlement_pct", "indicator": "Ind_04_02", "group": "land", "unit": "%",
        "label": {"de": "Siedlungsfläche", "fr": "Surface d'habitat", "it": "Superficie d'insediamento", "rm": "Surfatscha d'insediament", "en": "Settlement area"},
    },
    {
        "id": "agricultural_pct", "indicator": "Ind_04_04", "group": "land", "unit": "%",
        "label": {"de": "Landwirtschaftsfläche", "fr": "Surface agricole", "it": "Superficie agricola", "rm": "Surfatscha agricola", "en": "Agricultural area"},
    },
    {
        "id": "wooded_pct", "indicator": "Ind_04_06", "group": "land", "unit": "%",
        "label": {"de": "Wald und Gehölze", "fr": "Surface boisée", "it": "Superficie boscata", "rm": "Surfatscha da guaud", "en": "Wooded area"},
    },
    # housing
    {
        "id": "vacant_dwellings_pct", "indicator": "Ind_08_01", "group": "housing", "unit": "%",
        "label": {"de": "Leerwohnungsziffer", "fr": "Taux de logements vacants", "it": "Tasso di abitazioni vuote", "rm": "Quota d'abitaziuns libras", "en": "Vacant dwelling rate"},
    },
    {
        "id": "new_housing_rate", "indicator": "Ind_08_04", "group": "housing", "unit": "/1000",
        "label": {"de": "Neue Wohnungen", "fr": "Nouveaux logements", "it": "Abitazioni nuove", "rm": "Novas abitaziuns", "en": "New housing units"},
    },
    # social
    {
        "id": "social_assistance_pct", "indicator": "Ind_11_01", "group": "social", "unit": "%",
        "label": {"de": "Sozialhilfequote", "fr": "Taux d'aide sociale", "it": "Quota d'assistenza sociale", "rm": "Quota d'agid social", "en": "Social assistance rate"},
    },
    # politics — individual parties
    {
        "id": "vote_svp_pct", "indicator": "Ind_14_04", "group": "politics", "unit": "%",
        "label": {"de": "SVP", "fr": "UDC", "it": "SVP/UDC", "rm": "SVP", "en": "SVP/UDC"},
    },
    {
        "id": "vote_sp_pct", "indicator": "Ind_14_03", "group": "politics", "unit": "%",
        "label": {"de": "SP", "fr": "PS", "it": "PS", "rm": "SP", "en": "SP/PS"},
    },
    {
        "id": "vote_fdp_pct", "indicator": "Ind_14_01", "group": "politics", "unit": "%",
        "label": {"de": "FDP", "fr": "PLR", "it": "FDP/PLR", "rm": "FDP", "en": "FDP/PLR"},
    },
    {
        "id": "vote_cvp_pct", "indicator": "Ind_14_02", "group": "politics", "unit": "%",
        "label": {"de": "CVP/Die Mitte", "fr": "PDC/Le Centre", "it": "PPD/Il Centro", "rm": "PDC", "en": "CVP/Centre"},
    },
    {
        "id": "vote_gps_pct", "indicator": "Ind_14_09", "group": "politics", "unit": "%",
        "label": {"de": "GPS", "fr": "PES", "it": "Verdi", "rm": "PES", "en": "GPS/Greens"},
    },
    {
        "id": "vote_glp_pct", "indicator": "Ind_14_06", "group": "politics", "unit": "%",
        "label": {"de": "GLP", "fr": "PVL", "it": "PVL", "rm": "PVL", "en": "GLP/GreenLiberal"},
    },
    {
        "id": "vote_evp_pct", "indicator": "Ind_14_05", "group": "politics", "unit": "%",
        "label": {"de": "EVP/CSP", "fr": "PEV/PCS", "it": "PEV/PCS", "rm": "PEV/PCS", "en": "EVP/CSP"},
    },
    {
        "id": "vote_bdp_pct", "indicator": "Ind_14_07", "group": "politics", "unit": "%",
        "label": {"de": "BDP", "fr": "PBD", "it": "PBD", "rm": "PBD", "en": "BDP"},
    },
    {
        "id": "vote_right_small_pct", "indicator": "Ind_14_10", "group": "politics", "unit": "%",
        "label": {"de": "Kleine Rechtsparteien", "fr": "Petits partis de droite", "it": "Piccoli partiti di destra", "rm": "Perts dretscha pitschna", "en": "Small right-wing parties"},
    },
]

# Indicators needed only for computing derived topics (not shown directly)
RAW_EXTRA = {"Ind_06_03", "Ind_06_04", "Ind_06_05", "Ind_06_06"}

INDICATOR_TO_TOPIC = {t["indicator"]: t["id"] for t in TOPICS}

# ── Computed topics (added after CSV parse) ────────────────────────────────────

COMPUTED_TOPICS: list[dict] = [
    {
        "id": "primary_sector_pct", "group": "economy", "unit": "%",
        "label": {"de": "Primärsektor", "fr": "Secteur primaire", "it": "Settore primario", "rm": "Sectur primari", "en": "Primary sector"},
    },
    {
        "id": "secondary_sector_pct", "group": "economy", "unit": "%",
        "label": {"de": "Sekundärsektor", "fr": "Secteur secondaire", "it": "Settore secondario", "rm": "Sectur secundar", "en": "Secondary sector"},
    },
    {
        "id": "tertiary_sector_pct", "group": "economy", "unit": "%",
        "label": {"de": "Tertiärsektor", "fr": "Secteur tertiaire", "it": "Settore terziario", "rm": "Sectur terziaris", "en": "Tertiary sector"},
    },
    {
        "id": "left_right_index", "group": "politics", "unit": "pts",
        "color_scale": "diverging",
        "label": {
            "de": "Links-Rechts-Index",
            "fr": "Indice gauche-droite",
            "it": "Indice sinistra-destra",
            "rm": "Indicatur sanester-dretg",
            "en": "Left–right index",
        },
    },
]


# ── CSV parsing ────────────────────────────────────────────────────────────────

def download_csv(force: bool = False) -> Path:
    if CACHE_CSV.exists() and not force:
        print(f"  CSV already cached ({CACHE_CSV.name}) — use --force to re-download")
        return CACHE_CSV
    print(f"  Downloading {CSV_URL}")
    resp = requests.get(CSV_URL, timeout=120, headers={"User-Agent": "swiss-maps-pipeline/1.0"})
    resp.raise_for_status()
    CACHE_CSV.write_bytes(resp.content)
    print(f"  Saved {CACHE_CSV.name} ({CACHE_CSV.stat().st_size / 1024:.0f} KB)")
    return CACHE_CSV


def parse_csv(csv_path: Path) -> tuple[dict[int, dict[str, float]], dict[int, dict[str, float]]]:
    """Return (communes, raw_extra) where raw_extra holds Ind_06_xx for sector % computation."""
    communes: dict[int, dict[str, float]] = {}
    raw_extra: dict[int, dict[str, float]] = {}

    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f, delimiter=";")
        for row in reader:
            if row["STATUS"] != "A":
                continue
            code = row["CODE_REGION"]
            try:
                bfs = int(code)
            except ValueError:
                continue
            ind = row["INDICATORS"]
            try:
                value = float(row["VALUE"])
            except (ValueError, TypeError):
                continue

            if ind in INDICATOR_TO_TOPIC:
                communes.setdefault(bfs, {})[INDICATOR_TO_TOPIC[ind]] = round(value, 4)
            elif ind in RAW_EXTRA:
                raw_extra.setdefault(bfs, {})[ind] = value

    return communes, raw_extra


# ── Computed indicators ────────────────────────────────────────────────────────

def add_computed(
    communes: dict[int, dict[str, float]],
    raw_extra: dict[int, dict[str, float]],
) -> None:
    """Mutates communes in-place with derived indicator values."""
    for bfs, vals in communes.items():
        # Employment sector percentages
        rx = raw_extra.get(bfs, {})
        total = rx.get("Ind_06_03")
        if total and total > 0:
            for src, tid in [
                ("Ind_06_04", "primary_sector_pct"),
                ("Ind_06_05", "secondary_sector_pct"),
                ("Ind_06_06", "tertiary_sector_pct"),
            ]:
                v = rx.get(src)
                if v is not None:
                    vals[tid] = round(v / total * 100, 2)

        # Left-right index: (SVP + FDP) minus (SP + GPS + GLP)
        right = vals.get("vote_svp_pct", 0) + vals.get("vote_fdp_pct", 0)
        left = vals.get("vote_sp_pct", 0) + vals.get("vote_gps_pct", 0) + vals.get("vote_glp_pct", 0)
        if any(k in vals for k in ("vote_svp_pct", "vote_sp_pct", "vote_fdp_pct")):
            vals["left_right_index"] = round(right - left, 2)


# ── Canton aggregates ──────────────────────────────────────────────────────────

def load_canton_mapping() -> dict[int, int] | None:
    if not GEO_MUNICIPALITIES.exists():
        print(f"  Note: {GEO_MUNICIPALITIES.name} not found — skipping canton aggregates")
        print("  Run export_geo.py first to enable canton-level demographics")
        return None
    geo = json.loads(GEO_MUNICIPALITIES.read_text())
    mapping: dict[int, int] = {}
    for feat in geo["features"]:
        props = feat["properties"]
        bfs = props.get("bfs_nummer")
        kanton = props.get("kantonsnummer")
        if bfs and kanton:
            mapping[int(bfs)] = int(kanton)
    return mapping


def aggregate_cantons(
    communes: dict[int, dict[str, float]],
    canton_map: dict[int, int],
    all_topic_ids: list[str],
) -> dict[int, dict[str, float]]:
    canton_groups: dict[int, list[dict[str, float]]] = {}
    for bfs, values in communes.items():
        k = canton_map.get(bfs)
        if k is not None:
            canton_groups.setdefault(k, []).append(values)

    result: dict[int, dict[str, float]] = {}
    for k, commune_list in canton_groups.items():
        agg: dict[str, float] = {}
        for tid in all_topic_ids:
            vals = [d[tid] for d in commune_list if tid in d]
            if vals:
                agg[tid] = round(sum(vals) / len(vals), 4)
        result[k] = agg
    return result


# ── Supplementary source merging ──────────────────────────────────────────────

def merge_typology(communes: dict[int, dict[str, float]]) -> list[dict] | None:
    """Merge urban_rural typology (1/2/3) into communes. Returns topic spec or None."""
    path = OUT_DIR / "typology.json"
    if not path.exists():
        print("  typology.json not found — run download_typology.py first")
        return None
    data: dict[str, int] = json.loads(path.read_text())
    count = 0
    for bfs_str, cls in data.items():
        bfs = int(bfs_str)
        if bfs in communes:
            communes[bfs]["urban_rural"] = float(cls)
            count += 1
    print(f"  Typology: {count} communes merged")
    return [{
        "id": "urban_rural",
        "group": "context",
        "unit": "",
        "color_scale": "categorical",
        "domain": [1.0, 3.0],
        "categories": TYPOLOGY_CATEGORIES,
        "label": {"de": "Städtisch / Periurban / Ländlich", "fr": "Urbain / Périurbain / Rural",
                  "it": "Urbano / Periurbano / Rurale", "rm": "Urban / Periurban / Rural",
                  "en": "Urban / Periurban / Rural"},
        "source": "swisstopo Agglomerationstypen 2022",
        "year": 2022,
    }]


def merge_income(communes: dict[int, dict[str, float]]) -> list[dict] | None:
    """Merge median/average taxable income into communes. Returns topic specs or None."""
    path = OUT_DIR / "income.json"
    if not path.exists():
        print("  income.json not found — run download_income.py first")
        return None
    data = json.loads(path.read_text())
    count = 0
    for bfs_str, row in data["communes"].items():
        bfs = int(bfs_str)
        if bfs in communes:
            communes[bfs].update(row)
            count += 1
    print(f"  Income: {count} communes merged")
    return [
        {"id": "median_taxable_income_chf", "unit": "CHF",
         "label": {"de": "Steuerbares Einkommen (Median)", "fr": "Revenu imposable (médiane)",
                   "it": "Reddito imponibile (mediana)", "rm": "Renda taxabla (median)",
                   "en": "Taxable income (median)"}},
        {"id": "avg_taxable_income_chf", "unit": "CHF",
         "label": {"de": "Steuerbares Einkommen (Durchschnitt)", "fr": "Revenu imposable (moyenne)",
                   "it": "Reddito imponibile (media)", "rm": "Renda taxabla (media)",
                   "en": "Taxable income (average)"}},
    ]


def merge_language(communes: dict[int, dict[str, float]]) -> list[dict] | None:
    """Merge linguistic region + home language data into communes. Returns topic specs or None."""
    path = OUT_DIR / "language.json"
    if not path.exists():
        print("  language.json not found — run download_language.py first")
        return None
    data = json.loads(path.read_text())
    count = 0
    for bfs_str, row in data["communes"].items():
        bfs = int(bfs_str)
        if bfs in communes:
            communes[bfs].update(row)
            count += 1
    print(f"  Language: {count} communes merged")

    region_topic = {
        "id": "official_language_region",
        "group": "language",
        "unit": "",
        "color_scale": "categorical",
        "domain": [1.0, 4.0],
        "categories": LANGUAGE_REGION_CATEGORIES,
        "label": {"de": "Sprachgebiet", "fr": "Région linguistique", "it": "Regione linguistica",
                  "rm": "Territori linguistic", "en": "Linguistic region"},
        "source": "BFS Raumgliederungen der Gemeinden",
        "year": 2020,
    }
    home_lang_topics = [
        {"id": "lang_german_pct",  "label": {"de": "Hauptsprache Deutsch", "fr": "Langue principale allemand", "it": "Lingua principale tedesco", "rm": "Lingua principala tudestg", "en": "Main language German"}},
        {"id": "lang_french_pct",  "label": {"de": "Hauptsprache Französisch", "fr": "Langue principale français", "it": "Lingua principale francese", "rm": "Lingua principala franzos", "en": "Main language French"}},
        {"id": "lang_italian_pct", "label": {"de": "Hauptsprache Italienisch", "fr": "Langue principale italien", "it": "Lingua principale italiano", "rm": "Lingua principala talian", "en": "Main language Italian"}},
        {"id": "lang_romansh_pct", "label": {"de": "Hauptsprache Rätoromanisch", "fr": "Langue principale romanche", "it": "Lingua principale romancio", "rm": "Lingua principala rumantsch", "en": "Main language Romansh"}},
        {"id": "lang_other_pct",   "label": {"de": "Hauptsprache andere", "fr": "Langue principale autre", "it": "Lingua principale altra", "rm": "Autra lingua principala", "en": "Main language other"}},
    ]
    return [region_topic] + home_lang_topics


def merge_religion(communes: dict[int, dict[str, float]]) -> list[dict] | None:
    """Merge religion percentages into communes. Returns list of topic specs or None."""
    path = OUT_DIR / "religion.json"
    if not path.exists():
        print("  religion.json not found — run download_religion.py first")
        return None
    data = json.loads(path.read_text())
    count = 0
    for bfs_str, row in data["communes"].items():
        bfs = int(bfs_str)
        if bfs in communes:
            for k, v in row.items():
                communes[bfs][f"rel_{k}"] = v
            count += 1
    print(f"  Religion: {count} communes merged")
    return [
        {"id": "rel_catholic_pct",    "label": {"de": "Katholisch", "fr": "Catholique", "it": "Cattolico", "rm": "Catolic", "en": "Catholic"}},
        {"id": "rel_reformed_pct",    "label": {"de": "Evangelisch-reformiert", "fr": "Protestant réformé", "it": "Protestante riformato", "rm": "Protestant-refurmà", "en": "Reformed Protestant"}},
        {"id": "rel_no_religion_pct", "label": {"de": "Konfessionslos", "fr": "Sans appartenance religieuse", "it": "Senza appartenenza religiosa", "rm": "Senza confessiun", "en": "No religion"}},
        {"id": "rel_muslim_pct",      "label": {"de": "Muslimisch", "fr": "Musulman", "it": "Musulmano", "rm": "Muslim", "en": "Muslim"}},
        {"id": "rel_other_pct",       "label": {"de": "Andere Religion", "fr": "Autre religion", "it": "Altra religione", "rm": "Autra religiun", "en": "Other religion"}},
        {"id": "rel_jewish_pct",      "label": {"de": "Jüdisch", "fr": "Juif", "it": "Ebraico", "rm": "Giudaic", "en": "Jewish"}},
    ]


# ── Domain computation ─────────────────────────────────────────────────────────

def compute_domain(
    communes: dict[int, dict[str, float]],
    topic_id: str,
    color_scale: str = "sequential",
) -> list[float]:
    vals = sorted(v[topic_id] for v in communes.values() if topic_id in v)
    if not vals:
        return [0.0, 100.0]
    n = len(vals)
    p5 = vals[max(0, int(n * 0.05))]
    p95 = vals[min(n - 1, int(n * 0.95))]

    if color_scale == "diverging":
        # Symmetric around 0 so neutral midpoint is always visually centred
        extent = max(abs(p5), abs(p95))
        return [round(-extent, 2), round(extent, 2)]

    return [round(p5, 2), round(p95, 2)]


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Re-download the CSV")
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    print("Downloading CSV...")
    csv_path = download_csv(force=args.force)

    print("Parsing indicators...")
    communes, raw_extra = parse_csv(csv_path)
    print(f"  {len(communes)} communes")

    print("Computing derived indicators...")
    add_computed(communes, raw_extra)

    print("Merging supplementary sources...")
    typo_topics = merge_typology(communes) or []
    reli_topics = merge_religion(communes) or []
    income_topics = merge_income(communes) or []
    lang_topics = merge_language(communes) or []
    lang_region_topics = [t for t in lang_topics if "color_scale" in t]
    lang_pct_topics = [t for t in lang_topics if "color_scale" not in t]

    canton_map = load_canton_mapping()
    all_topic_ids = [t["id"] for t in TOPICS + COMPUTED_TOPICS] + \
                    [t["id"] for t in typo_topics] + \
                    [t["id"] for t in reli_topics] + \
                    [t["id"] for t in income_topics] + \
                    [t["id"] for t in lang_topics]

    cantons: dict[int, dict[str, float]] = {}
    if canton_map:
        cantons = aggregate_cantons(communes, canton_map, all_topic_ids)
        print(f"  {len(cantons)} cantons aggregated")

    print("Computing colour domains...")
    topics_out = []

    # Categorical topics first (fixed domain, no P5/P95)
    for t in typo_topics + lang_region_topics:
        topics_out.append({
            "id": t["id"], "group": t["group"], "label": t["label"],
            "unit": t["unit"], "color_scale": t["color_scale"],
            "domain": t["domain"], "categories": t.get("categories"),
            "source": t["source"], "year": t["year"],
        })

    # Standard Regionalportraits indicators
    for t in TOPICS + COMPUTED_TOPICS:
        color_scale = t.get("color_scale", "sequential")
        domain = compute_domain(communes, t["id"], color_scale)
        topics_out.append({
            "id": t["id"], "group": t["group"], "label": t["label"],
            "unit": t["unit"], "color_scale": color_scale,
            "domain": domain, "categories": None,
            "source": "BFS Regionalportraits 2021", "year": 2019,
        })

    # Religion indicators (sequential, domains from data)
    for t in reli_topics:
        domain = compute_domain(communes, t["id"])
        topics_out.append({
            "id": t["id"], "group": "religion", "label": t["label"],
            "unit": "%", "color_scale": "sequential",
            "domain": domain, "categories": None,
            "source": "BFS Volkszählung 2000", "year": 2000,
        })

    # Income indicators (sequential, domains from data)
    for t in income_topics:
        domain = compute_domain(communes, t["id"])
        topics_out.append({
            "id": t["id"], "group": "economy", "label": t["label"],
            "unit": t["unit"], "color_scale": "sequential",
            "domain": domain, "categories": None,
            "source": "ESTV Steuerstatistik direkte Bundessteuer 2022", "year": 2022,
        })

    # Home language indicators (sequential, domains from data)
    for t in lang_pct_topics:
        domain = compute_domain(communes, t["id"])
        topics_out.append({
            "id": t["id"], "group": "language", "label": t["label"],
            "unit": "%", "color_scale": "sequential",
            "domain": domain, "categories": None,
            "source": "BFS Volkszählung 2000", "year": 2000,
        })

    output = {
        "meta": {
            "source": "BFS Regionalportraits 2021",
            "reference_year": 2019,
            "downloaded": date.today().isoformat(),
            "url": CSV_URL,
        },
        "groups": GROUPS,
        "topics": topics_out,
        "communes": {str(k): v for k, v in sorted(communes.items())},
        "cantons": {str(k): v for k, v in sorted(cantons.items())},
    }

    out_path = OUT_DIR / "index.json"
    out_path.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")))
    size_kb = out_path.stat().st_size / 1024
    print(f"  Written {out_path.relative_to(ROOT)} ({size_kb:.0f} KB)")
    print(f"  {len(communes)} communes · {len(cantons)} cantons · {len(topics_out)} topics")


if __name__ == "__main__":
    main()
