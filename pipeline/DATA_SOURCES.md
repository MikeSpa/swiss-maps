# Data Sources

Comprehensive reference for all datasets used in the Swiss Maps pipeline.

---

## 1. Overview

| Dataset | Source | URL / API | Reference Year | Coverage | What We Extract |
|---|---|---|---|---|---|
| Trade by partner | BAZG (Swiss Customs) | `bazg.admin.ch/dam/…/2_4_LD_EXP_en.xlsx` + `…IMP…` | 2024 actuals | 245 countries, exports + imports | Business-cycle bilateral totals, used for trade arc map |
| Commune boundaries | swisstopo (GeoPackage) | `https://dam-api.bfs.admin.ch/hub/api/dam/assets/21224783/master` | 2022 | All ~2150 communes, 26 cantons, ~148 districts | GeoJSON for cantons, districts, municipalities |
| Votation results | opendata.swiss / BFS | `https://ogd-static.voteinfo-app.ch/v1/ogd/sd-t-17-02-{YYYYMMDD}-eidgAbstimmung.json` | Per vote date | National + canton + district + municipality | Yes/no counts, turnout, counting status |
| Demographic indicators | BFS Regionalportraits 2021 (opendata.swiss) | `https://dam-api.bfs.admin.ch/hub/api/dam/assets/16484444/master` | 2019 | ~2130 communes | 26 direct indicators + 4 computed (see §2) |
| Population by age/sex/citizenship | BFS STATPOP (PxWeb `px-x-0102010000_101`) | `https://www.pxweb.bfs.admin.ch/api/v1/de/px-x-0102010000_101/` | 2010–2024 | All municipalities | Age distribution, Swiss/foreign ratio (see §3) |
| Religion (2000 census) | BFS Volkszählung 2000 (PxWeb `px-x-4003000000_122`) | `https://www.pxweb.bfs.admin.ch/api/v1/de/px-x-4003000000_122/px-x-4003000000_122.px` | 2000 | ~2100 communes | Reformed, Catholic, Muslim, Jewish, no religion, other (see §4) |
| Agglomeration typology | swisstopo boundaries ZIP, sheet `g1a22` | Same ZIP as commune boundaries above | 2022 | ~1418 communes (remainder are rural) | Urban / periurban / rural class per commune (see §5) |
| Taxable income | ESTV direct federal tax statistics (xlsx) | `https://www.estv.admin.ch/dam/de/sd-web/wum7OKVNOOwl/statistik-dbst-np-gden-2022-normalfall.xlsx` | 2022 | ~2148 communes | Median + average taxable income per commune (see §7) |
| Linguistic region | BFS Raumgliederungen der Gemeinden (`agvchapp` API) | `https://www.agvchapp.bfs.admin.ch/api/communes/levels?date=01-01-2026` | 2020 (SPRGEB2020) | ~2110 communes | Official language area: German/French/Italian/Romansh (see §8) |
| Home language (2000 census) | BFS Volkszählung 2000 (PxWeb `px-x-4003000000_123`) | `https://www.pxweb.bfs.admin.ch/api/v1/de/px-x-4003000000_123/px-x-4003000000_123.px` | 2000 | ~2100 communes | German/French/Italian/Romansh/other main-language shares (see §8) |

---

## 2. BFS Regionalportraits 2021

**Script:** `pipeline/scripts/download_demographics.py`
**Output:** `public/demographics/index.json`

### Format

Long-format CSV, semicolon-delimited. Key columns:

| Column | Description |
|---|---|
| `CODE_REGION` | BFS commune number (= `bfs_nummer` in the GeoJSON). Rows with non-numeric codes are canton/district aggregates — skip them. |
| `STATUS` | `A` = active/current. Only rows with `STATUS=A` are used. |
| `INDICATORS` | Indicator code (e.g. `Ind_01_08`). |
| `VALUE` | Numeric value for this indicator in this commune. |

### Reference year

All indicators refer to **2019** (stated as the reference year in the BFS publication). The dataset was last published in the 2021 edition. **No newer version has been found on opendata.swiss** — the BFS API returns only the 2021 edition for this asset.

### Indicators extracted (26 direct + 4 computed = 30 total)

**Population**

| ID | BFS Indicator | Unit | Description |
|---|---|---|---|
| `foreign_pct` | `Ind_01_08` | % | Share of foreign nationals |
| `pop_change_pct` | `Ind_01_02` | % | Population growth (recent period) |
| `pop_density` | `Ind_01_03` | inh/km² | Population density |
| `household_size` | `Ind_01_14` | persons | Average household size |

**Age**

| ID | BFS Indicator | Unit | Description |
|---|---|---|---|
| `age_young_pct` | `Ind_01_04` | % | Share aged 0–19 |
| `age_working_pct` | `Ind_01_05` | % | Share aged 20–64 |
| `age_senior_pct` | `Ind_01_06` | % | Share aged 65+ |

**Vital statistics**

| ID | BFS Indicator | Unit | Description |
|---|---|---|---|
| `birth_rate` | `Ind_01_11` | ‰ | Birth rate per 1000 inhabitants |
| `death_rate` | `Ind_01_12` | ‰ | Death rate per 1000 inhabitants |
| `marriage_rate` | `Ind_01_09` | ‰ | Marriage rate per 1000 inhabitants |
| `divorce_rate` | `Ind_01_10` | ‰ | Divorce rate per 1000 inhabitants |

**Land use**

| ID | BFS Indicator | Unit | Description |
|---|---|---|---|
| `settlement_pct` | `Ind_04_02` | % | Share of settlement / built-up area |
| `agricultural_pct` | `Ind_04_04` | % | Share of agricultural area |
| `wooded_pct` | `Ind_04_06` | % | Share of wooded / forested area |

**Housing**

| ID | BFS Indicator | Unit | Description |
|---|---|---|---|
| `vacant_dwellings_pct` | `Ind_08_01` | % | Vacant dwelling rate |
| `new_housing_rate` | `Ind_08_04` | /1000 | New housing units per 1000 inhabitants |

**Social**

| ID | BFS Indicator | Unit | Description |
|---|---|---|---|
| `social_assistance_pct` | `Ind_11_01` | % | Social assistance (Sozialhilfe) rate |

**Politics (2019 National Council elections)**

| ID | BFS Indicator | Unit | Description |
|---|---|---|---|
| `vote_svp_pct` | `Ind_14_04` | % | SVP/UDC vote share |
| `vote_sp_pct` | `Ind_14_03` | % | SP/PS vote share |
| `vote_fdp_pct` | `Ind_14_01` | % | FDP/PLR vote share |
| `vote_cvp_pct` | `Ind_14_02` | % | CVP/Die Mitte vote share |
| `vote_gps_pct` | `Ind_14_09` | % | GPS/Greens vote share |
| `vote_glp_pct` | `Ind_14_06` | % | GLP/GreenLiberal vote share |
| `vote_evp_pct` | `Ind_14_05` | % | EVP/CSP vote share |
| `vote_bdp_pct` | `Ind_14_07` | % | BDP vote share |
| `vote_right_small_pct` | `Ind_14_10` | % | Small right-wing parties |

**Computed from raw BFS indicators (not a direct CSV column)**

| ID | Source indicators | Unit | Formula |
|---|---|---|---|
| `primary_sector_pct` | `Ind_06_04` / `Ind_06_03` | % | Employment in primary sector (agriculture) |
| `secondary_sector_pct` | `Ind_06_05` / `Ind_06_03` | % | Employment in secondary sector (industry) |
| `tertiary_sector_pct` | `Ind_06_06` / `Ind_06_03` | % | Employment in tertiary sector (services) |
| `left_right_index` | `vote_svp+fdp` − `vote_sp+gps+glp` | pts | Composite left–right index (diverging scale) |

### What is NOT in this dataset

- No income / median taxable income data — now covered separately, see §7
- No unemployment rate (still unavailable, see §9)
- No religion data — covered separately, see §4
- No language data — now covered separately, see §8

---

## 3. BFS STATPOP — Population by Age, Sex, Citizenship

**PxWeb table:** `px-x-0102010000_101`
**API base:** `https://www.pxweb.bfs.admin.ch/api/v1/de/px-x-0102010000_101/`
**Status:** Confirmed working via PxWeb JSON-stat2 API; not yet used in a standalone pipeline script.

### Variables

| Variable | Description |
|---|---|
| Year | 2010–2024 (annual) |
| Sex | Male / Female / Total |
| Age | Individual years 0–100+ |
| Citizenship | Swiss / Foreign / Total (only 2 categories — no country-of-origin breakdown at municipality level) |
| Commune | Municipality-level granularity via BFS number |

### Use cases

- Age pyramid per municipality
- Dependency ratio (0–19 + 65+ vs 20–64)
- Share of foreign nationals (more up-to-date than Regionalportraits 2019)
- Population size time series 2010–2024

### Limitations

- Foreign nationals = only Swiss vs. Foreign. Country-of-origin data is not available at municipality level via this table (see §6).
- Very small municipalities may have suppressed values for individual age/sex cells.

---

## 4. BFS 2000 Census — Religion

**Script:** `pipeline/scripts/download_religion.py`
**Output:** `public/demographics/religion.json`
**PxWeb table:** `px-x-4003000000_122`
**API base:** `https://www.pxweb.bfs.admin.ch/api/v1/de/px-x-4003000000_122/px-x-4003000000_122.px`

### IMPORTANT: 2000 data only

This is Volkszählung (census) 2000 data. It is the last full-population census where religion was recorded for every resident. Post-2000 religion data comes from the **Strukturerhebung** (structural survey), which is a **sample survey** (~200,000 respondents/year). Sample data is only statistically representative at:

- Canton level for all cantons
- Municipality level for municipalities with approximately **3,000+ respondents per year** (roughly the top 50–60 largest communes)

Consequently, municipality-level religion data from Strukturerhebung 2010–2023 is not suitable for a choropleth covering all ~2100 Swiss communes.

### Commune boundary changes

Commune mergers and boundary changes between 2000 and the current boundaries (used in the GeoJSON files) will cause approximately 5–10% of BFS numbers to not match. These are communes that have been merged into another since 2000; their 2000 religion data is simply absent in the output.

### Raw categories (19 in the full table, 7 queried)

| Code | Label | Output field |
|---|---|---|
| `0` | Total | (denominator for percentage calculation) |
| `1` | Reformiert-Evangelisch | `reformed_pct` |
| `8` | Römisch-Katholisch | `catholic_pct` |
| `12` | Jüdisch | `jewish_pct` |
| `13` | Islamisch | `muslim_pct` |
| `17` | Konfessionslos | `no_religion_pct` |
| `18` | Keine Angabe | (excluded from output, part of `other_pct`) |

The remaining 12 categories (Orthodox, Old-Catholic, Neo-apostolic, Buddhist, Hindu, etc.) are consolidated into `other_pct = 100 − reformed − catholic − muslim − jewish − no_religion`.

### Batching

The ~2100 communes are queried in batches of 200 (approximately 11 batches) with a 1.5 s sleep between batches to respect API rate limits. HTTP 429 responses trigger a 10 s wait and a single retry.

### Output structure

```json
{
  "meta": { "source": "BFS Volkszählung 2000", "year": 2000 },
  "communes": {
    "1":  { "reformed_pct": 56.8, "catholic_pct": 19.3, "muslim_pct": 0.5, "jewish_pct": 0.1, "no_religion_pct": 15.4, "other_pct": 7.9 },
    "2":  { ... }
  }
}
```

All percentage values are rounded to 2 decimal places and clamped to [0, 100].

---

## 5. Swisstopo Agglomeration Typology

**Script:** `pipeline/scripts/download_typology.py`
**Output:** `public/demographics/typology.json`, `public/demographics/typology_meta.json`
**Source:** Same swisstopo boundaries ZIP as `download_boundaries.py`
**URL:** `https://dam-api.bfs.admin.ch/hub/api/dam/assets/21224783/master`

### Source field: ACAT

The `ACAT` column in sheet `g1a22` of the Excel file inside the boundaries ZIP is the **agglomeration category** assigned by swisstopo to each commune that is part of or adjacent to an agglomeration. The reference boundary year is **2022**.

Only ~1418 communes have an explicit ACAT value. The remaining ~730 communes are not part of any agglomeration and are classified as rural.

### ACAT → typology class mapping

| ACAT value | Swisstopo label | Typology class | Label |
|---|---|---|---|
| 1 | Kernstadt (core city) | 1 | Urban |
| 2 | Gürteldgemeinde (suburban belt) | 1 | Urban |
| 3 | Sekundäres Zentrum (secondary city) | 1 | Urban |
| 4 | Periurbane Gemeinde (periurban) | 2 | Periurban |
| 6 | Isoliertes Städtisches Zentrum (isolated urban centre) | 2 | Periurban |
| not in sheet | — | 3 | Rural |

Note: ACAT value 5 is not defined in the confirmed research data. If encountered it is treated as rural (class 3).

### Output: typology.json

A flat object mapping `str(bfs_nummer)` → typology class (integer 1, 2, or 3).

```json
{ "1": 1, "2": 1, "3": 3, "4": 3, ... }
```

### Output: typology_meta.json

Maps each class number (as string) to its multilingual labels:

```json
{
  "1": { "de": "Städtisch", "fr": "Urbain", "it": "Urbano", "rm": "Urban", "en": "Urban" },
  "2": { "de": "Periurban", "fr": "Périurbain", "it": "Periurbano", "rm": "Periurban", "en": "Periurban" },
  "3": { "de": "Ländlich", "fr": "Rural", "it": "Rurale", "rm": "Rural", "en": "Rural" }
}
```

---

## 6. BAZG Trade Data

**Script:** `pipeline/scripts/download_trade.py`
**Output:** `public/trade/trade_2024.json`
**Sources:**
- Exports: `https://www.bazg.admin.ch/dam/en/sd-web/L0lqLFfjaSe2/2_4_LD_EXP_en.xlsx`
- Imports: `https://www.bazg.admin.ch/dam/en/sd-web/-bHd3OniokpL/2_4_LD_IMP_en.xlsx`

### Business cycle total vs. general total

Each BAZG file contains two side-by-side ranking tables. We use the **business cycle total** (cols A–F):
- Excludes: precious metals, precious stones and gems, works of art, antiques
- 2024 total: CHF ~283B exports, CHF ~222B imports
- **General total** (CHF ~394B exports) includes gold/gems — Switzerland is a major commodity trading hub, inflating bilateral figures

### Data coverage

| Item | Value |
|---|---|
| Countries in source | 245 |
| Partners in output (≥ CHF 100M) | 96 |
| Partners with map centroids | 63 |
| Reference year | 2024 actuals (published May 2025) |

### Slovenia note

Slovenia ranks #3 in both exports (~CHF 26B) and imports (~CHF 18B). This reflects pharma supply chains (Novartis, Roche manufacturing sites in Slovenia producing active ingredients). Real data, not an error.

### Limitations

- Per-country sector breakdown is now available via `sectors_by_country.json` (see §6b below).
- UN Comtrade Plus and the legacy Comtrade API now require registration/subscription for data access (both return HTML instead of JSON when accessed without credentials).
- 33 partner countries above the CHF 100M threshold have no centroid defined in the pipeline and appear in the sidebar list only (no arc on the map).

### Output structure

```json
{
  "metadata": { "source": "BAZG", "reference_year": 2024, "total_exports": 283006, ... },
  "partners": [
    { "country": "Germany", "country_code": "DE", "exports": 41635, "imports": 53921, "balance": -12286,
      "fta_status": "EU_bilateral", "centroid": [10.5, 51.2] }
  ],
  "sectors": { "exports": [...], "imports": [...] },
  "timeseries": { "annual": [...2015-2025], "monthly_2025_2026": [...] }
}
```

## 6b. SwissImpex TN8_VK — Per-Country Sector Breakdown

**Script:** `pipeline/scripts/process_trade_sectors.py`
**Input:** `dev_scripts/trade/TN8_VK_EXP_en_v1.csv` + `TN8_VK_IMP_en_v1.csv`
**Output:** `public/trade/sectors_by_country.json`
**Source:** [SwissImpex / BAZG](https://www.swissimpex.admin.ch) — transaction-level bulk export (opendata.swiss)

### What it contains

Every Swiss trade transaction in 2025 at 8-digit HS tariff number × trading partner country × month × transport mode. Aggregated to HS2-chapter sector level per country.

| Field | Description |
|---|---|
| `year` | 2025 (full 12 months in the downloaded files) |
| `Tariffnumber8` | 8-digit HS code (format `XXXX.XXXX`; first 2 digits = chapter = sector) |
| `Country_isoAlpha2` | ISO-3166-1 alpha-2 country code |
| `Value_CHF` | Transaction value in CHF |

Chapter 71 (precious metals, gems, jewellery) is excluded to stay consistent with the business-cycle total used in the bilateral BAZG data.

### Relationship to §6 bilateral data

| | BAZG XLSX (§6) | SwissImpex TN8_VK (§6b) |
|---|---|---|
| Year | 2024 | 2025 |
| Grain | Country totals | HS8 × country × month × transport |
| Countries | 245 | 248 |
| Grand total exports | CHF 283B | CHF 277B (−2%) |
| Purpose | Bilateral totals, arc sizing | Sector shares per country |

The 2% total difference is a normal year-over-year change. Country-level differences are larger for financial trading hubs (Singapore, HK, UAE) because the TN8_VK transport-mode dataset misses some commodity and re-export flows that the summary bilateral file captures. **Sector percentage shares remain reliable for all countries.**

### Usage in the app

Sector % shares from 2025 are applied to 2024 bilateral totals to estimate per-country sector CHF values. This keeps all figures consistent with the 2024 baseline while providing sector granularity.

---

## 7. ESTV Taxable Income (Steuerstatistik)

**Script:** `pipeline/scripts/download_income.py`
**Output:** `public/demographics/income.json`
**Source:** ESTV (Federal Tax Administration) — Statistik der direkten Bundessteuer, natürliche Personen, Gemeinden, tax year 2022
**File:** `statistik-dbst-np-gden-2022-normalfall.xlsx`
**URL:** `https://www.estv.admin.ch/dam/de/sd-web/wum7OKVNOOwl/statistik-dbst-np-gden-2022-normalfall.xlsx`
**Landing page:** `https://www.estv.admin.ch/estv/de/home/die-estv/steuerstatistiken-estv/allgemeine-steuerstatistiken/direkte-bundessteuer/dbst-np-gemeinden-ab-1983.html`

This is the dataset referenced in the earlier opendata.swiss "Steuerb. Einkommen natürl. Pers. Median [Fr.]" listing — that listing only points to Kanton Zürich's open data (`KANTON_ZUERICH_316.csv`, ~184 ZH communes). The ESTV xlsx above is the **nationwide** equivalent, all ~2148 communes, directly downloadable (no API key, no manual click-through).

### Format

The workbook has sheets `511`–`524` (different cross-tabs of taxpayer counts / income sums / tax revenue, by "reines Einkommen" vs. "steuerbares Einkommen" brackets). We use:

| Sheet | Content |
|---|---|
| `521` | Number of taxpayers per **steuerbares Einkommen** (taxable income) bracket |
| `523` | Sum of taxable income (CHF) per same bracket |

Each sheet has the same row layout: `Kanton ID, Kanton, Gemeinde ID, Gemeinde, <10 bracket columns>, Total`. `Gemeinde ID` = `bfs_nummer`. Rows with `Gemeinde ID = 10000` are canton/national subtotal rows (skipped). `"- "` marks values withheld for privacy/tax-secrecy (treated as 0).

Bracket columns (CHF): `0`, `1–30'000`, `30'001–40'000`, `40'001–50'000`, `50'001–75'000`, `75'001–100'000`, `100'001–200'000`, `200'001–500'000`, `500'001–1'000'000`, `1'000'001+` (open-ended, capped at 2,000,000 for interpolation).

### Computed indicators

| ID | Formula | Unit |
|---|---|---|
| `avg_taxable_income_chf` | `sum(523 bracket totals) / sum(521 bracket totals)` | CHF |
| `median_taxable_income_chf` | Linear interpolation within the bracket containing the 50th-percentile taxpayer (from sheet `521`) | CHF |

Both are per-taxpayer (not per-capita / per-household) figures, "Normalfälle" only (excludes special cases like at-source taxation).

### Verified values (2022)

| Commune | Median | Average |
|---|---|---|
| Zürich (261) | CHF 54,735 | CHF 70,786 |
| Aeugst am Albis, ZH (1) | CHF 67,123 | CHF 89,951 |
| Genève (6621) | CHF 39,502 | CHF 53,578 |

---

## 8. Language: Linguistic Region + Home Language

**Script:** `pipeline/scripts/download_language.py`
**Output:** `public/demographics/language.json`

Two distinct datasets are merged here.

### 10a. Official linguistic region (current)

**Source:** BFS commune register, "Raumgliederungen der Gemeinden" API
**URL:** `https://www.agvchapp.bfs.admin.ch/api/communes/levels?date=01-01-2026`

This is the same `agvchapp` register used by the official commune list (`historisiertes-gemeindeverzeichnis-der-schweiz` on opendata.swiss). It returns a CSV with one row per commune and ~25 classification columns ("Raumgliederungen"): canton/district IDs, agglomeration codes, urbanity typology, etc. The column `SPRGEB2020` ("Sprachgebiet") is the official linguistic region:

| Code | Region | Count (of 2110 communes) |
|---|---|---|
| 1 | German | 1374 |
| 2 | French | 606 |
| 3 | Italian | 115 |
| 4 | Romansh | 15 |

Output field: `official_language_region` (categorical 1–4). Verified: Zürich=1, Genève=2, Lugano=3, Disentis/Mustér & Scuol=4.

### 10b. Home language (2000 census)

**PxWeb table:** `px-x-4003000000_123` — "Wohnbevölkerung 2000 nach Wohnsitztyp, Kanton/Bezirk/Gemeinde, Staatsangehörigkeit und Hauptsprache"
**API base:** `https://www.pxweb.bfs.admin.ch/api/v1/de/px-x-4003000000_123/px-x-4003000000_123.px`

Same vintage and limitations as the religion table (§4): **2000 census only**, last full-population survey. Post-2000 main-language data exists only in the Strukturerhebung sample survey (canton-level / large-commune representative only).

Query: `Wohnsitztyp=0` (civil residence), `Staatsangehörigkeit=0` (total), `Hauptsprache ∈ {0=Total, 1=Deutsch, 2=Französisch, 3=Italienisch, 4=Rätoromanisch}`. Same batching approach as `download_religion.py` (200 communes/batch, 1.5s sleep, json-stat2 ordering = commune slower, Hauptsprache faster).

Output fields per commune:

| ID | Description |
|---|---|
| `lang_german_pct` | Main language German |
| `lang_french_pct` | Main language French |
| `lang_italian_pct` | Main language Italian |
| `lang_romansh_pct` | Main language Romansh |
| `lang_other_pct` | Everything else (English, Portuguese, Serbo-Croatian, Albanian, Turkish, etc.) = `100 − sum(above 4)` |

### Verified values (2000 census home language)

| Commune | German | French | Italian | Romansh | Other |
|---|---|---|---|---|---|
| Zürich (261) | 77.6% | 2.0% | 4.4% | 0.2% | 15.8% |
| Genève (6621) | 3.6% | 72.5% | 4.0% | 0.1% | 19.9% |
| Lugano (5192) | 6.6% | 2.2% | 79.5% | 0.1% | 11.6% |

The gap between `lang_*_pct` (home language, 2000) and `official_language_region` (current) is itself informative — e.g. cities show a much higher "other" home-language share than their official region would suggest, reflecting immigration since 2000.

---

## 9. What We Looked for but Couldn't Find via API

### Unemployment rate

SECO (State Secretariat for Economic Affairs) publishes monthly registered unemployment figures. At municipality level these are distributed as complex Excel sheets. No clean municipality-level API endpoint was found during research.

### Religion post-2000

The **Strukturerhebung** (2010–2023) is a stratified sample survey of approximately 200,000 persons per year. It is representative at canton level and for municipalities with approximately 3,000+ respondents annually (roughly the 50–60 largest communes). It is not suitable for a choropleth across all ~2100 Swiss municipalities.

### Nationality by country of origin

BFS ZEMIS/AIG data exists and is accessible via PxWeb (`px-x-0103010000` series), but only down to **canton level** — municipality-level breakdown by country of origin is not available via the public API.

---

## 10. Dataset Dates Summary

| Indicator / Dataset | Source | Year of Data |
|---|---|---|
| Commune / district / canton boundaries (GeoJSON) | swisstopo | 2022 |
| Votation results | BFS opendata.swiss | Varies (per vote date; 2025–2026 loaded) |
| Foreign nationals share | BFS Regionalportraits | 2019 |
| Population growth | BFS Regionalportraits | 2019 |
| Population density | BFS Regionalportraits | 2019 |
| Household size | BFS Regionalportraits | 2019 |
| Age distribution (young / working / senior) | BFS Regionalportraits | 2019 |
| Vital statistics (birth / death / marriage / divorce) | BFS Regionalportraits | 2019 |
| Land use (settlement / agricultural / wooded) | BFS Regionalportraits | 2019 |
| Housing (vacant / new) | BFS Regionalportraits | 2019 |
| Social assistance rate | BFS Regionalportraits | 2019 |
| Employment by sector (primary / secondary / tertiary) | BFS Regionalportraits | 2019 |
| Party vote shares + left–right index | BFS Regionalportraits | 2019 (NR elections) |
| Religion (Reformed, Catholic, Muslim, Jewish, no religion) | BFS Volkszählung | 2000 |
| Urban / periurban / rural typology | swisstopo agglomeration classification | 2022 |
| Population by age, sex, citizenship (STATPOP) | BFS STATPOP | 2010–2024 (not yet scripted) |
| Taxable income (median / average) | ESTV Steuerstatistik | 2022 |
| Official linguistic region (German/French/Italian/Romansh) | BFS Raumgliederungen der Gemeinden (SPRGEB2020) | 2020 |
| Home language (German/French/Italian/Romansh/other) | BFS Volkszählung | 2000 |
