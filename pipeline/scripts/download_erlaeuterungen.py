"""
Downloads and extracts text from the official Swiss federal votation explanatory booklets.
Extracts per-proposal "In Kürze" summaries and government recommendation in DE, FR, IT.

Source: Bundeskanzlei (BK) — https://www.bk.admin.ch/bk/de/home/dokumentation/abstimmungsbuechlein.html

Usage:
  uv run python scripts/download_erlaeuterungen.py           # process all dates in index
  uv run python scripts/download_erlaeuterungen.py --date 20241124
  uv run python scripts/download_erlaeuterungen.py --force   # re-download cached PDFs

Output: public/votations/{DATE}_erlaeuterungen.json
"""

import argparse
import json
import re
import time
from pathlib import Path

import pdfplumber
import requests

ROOT = Path(__file__).parent.parent.parent
INDEX_FILE = ROOT / "public" / "votations" / "index.json"
OUT_DIR = ROOT / "public" / "votations"
PDF_CACHE_DIR = ROOT / "pipeline" / "data" / "erlaeuterungen_pdfs"

BK_BASE = "https://www.bk.admin.ch"
HEADERS = {"User-Agent": "swiss-maps/1.0"}

# Language-specific markers
INKUERZE = {"de": "In Kürze", "fr": "En bref", "it": "In breve"}
AUSGANGSLAGE = {"de": "Ausgangslage", "fr": "Contexte", "it": "Situazione iniziale"}
EMPFEHLUNG_ACCEPT = {
    "de": r"empfehlen\b[^.]{0,250}(anzunehmen|Ja\s*zu\s*stimmen)",
    "fr": r"recommand\w+\b[^.]{0,250}(d.accepter|d.adopter|de\s+voter\s+oui)",
    "it": r"raccomand\w+\b[^.]{0,250}(di\s+accettare|di\s+adottare)",
}
EMPFEHLUNG_REJECT = {
    "de": r"empfehlen\b[^.]{0,250}(abzulehnen|Nein\s*zu\s*stimmen)",
    "fr": r"recommand\w+\b[^.]{0,250}(de\s+rejeter|de\s+refuser|de\s+voter\s+non)",
    "it": r"raccomand\w+\b[^.]{0,250}(di\s+respingere|di\s+rifiutare)",
}
# Older PDF format: explicit "Empfehlung" header followed by Ja/Nein label
EMPFEHLUNG_OLD_YES = r"Empfehlung\s*\n[^\n]*\n\s*Ja\b"
EMPFEHLUNG_OLD_NO  = r"Empfehlung\s*\n[^\n]*\n\s*Nein\b"


def scrape_bk_pdf_map(lang: str) -> dict[str, str]:
    """Scrape BK page for given language and return {date_YYYYMMDD: pdf_url}."""
    url = f"{BK_BASE}/bk/{lang}/home/dokumentation/abstimmungsbuechlein.html"
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    html = resp.text

    # Anchor: href="/dam/bk/.../xxx.pdf..." text: "Erläuterungen des BR (DD.MM.YY)"
    anchors = re.findall(
        r'<a[^>]*href="(/dam/bk/[^"]+\.pdf[^"]*)"[^>]*>(.*?)</a>',
        html, re.S,
    )
    pdf_map: dict[str, str] = {}
    for path, raw_text in anchors:
        text = re.sub(r"<[^>]+>", "", raw_text)
        text = text.replace("&auml;", "ä").replace("&uuml;", "ü").replace("&eacute;", "é").strip()
        m = re.search(r"\((\d{1,2})\.(\d{1,2})\.(\d{2,4})\)", text)
        if not m:
            continue
        dd, mm, yy = m.groups()
        yyyy = f"20{yy}" if len(yy) == 2 else yy
        date = f"{yyyy}{mm.zfill(2)}{dd.zfill(2)}"
        if date not in pdf_map:
            pdf_map[date] = BK_BASE + path
    return pdf_map


def download_pdf(date: str, url: str, lang: str, force: bool = False) -> Path | None:
    PDF_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    dest = PDF_CACHE_DIR / f"{date}_{lang}.pdf"
    if dest.exists() and not force:
        return dest
    print(f"    Downloading {lang.upper()} PDF for {date}…")
    resp = requests.get(url, headers=HEADERS, timeout=60, stream=True)
    resp.raise_for_status()
    dest.write_bytes(resp.content)
    print(f"    Saved {dest.name} ({dest.stat().st_size // 1024} KB)")
    return dest


def extract_pages(pdf_path: Path) -> list[str]:
    with pdfplumber.open(pdf_path) as pdf:
        return [p.extract_text(x_tolerance=2, y_tolerance=3) or "" for p in pdf.pages]


def is_toc_page(text: str) -> bool:
    return "Inhaltsverzeichnis" in text or bool(re.search(r"In Kürze\s*[–-]\s*\d+|En bref\s*[–-]\s*\d+|In breve\s*[–-]\s*\d+", text))


def clean_text(text: str) -> str:
    """Remove PDF artefacts: page numbers, repeated headers, hyphenated line breaks."""
    # Re-join hyphenated line breaks
    text = re.sub(r"-\n(\w)", lambda m: m.group(1), text)
    # Remove isolated page numbers (lines that are just a number)
    text = re.sub(r"^\s*\d+\s*$", "", text, flags=re.M)
    # Collapse excess blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_inkuerze(pages: list[str], n_proposals: int, lang: str) -> list[str]:
    """
    Extract the 'In Kürze' / 'En bref' / 'In breve' summary pages per proposal.
    Returns a list of cleaned text strings, one per proposal.
    """
    marker = INKUERZE.get(lang, "In Kürze")
    context_key = AUSGANGSLAGE.get(lang, "Ausgangslage")

    # Find pages that are genuine 'In Kürze' opener pages:
    # they contain the section marker AND a context heading (not the TOC)
    inkuerze_page_indices: list[int] = []
    for i, page_text in enumerate(pages):
        if is_toc_page(page_text):
            continue
        if marker in page_text and (context_key in page_text or "Vorlage" in page_text[:200]):
            inkuerze_page_indices.append(i)

    # Collect text: opener + continuation page (if it exists and is not another section)
    sections: list[str] = []
    NEXT_SECTION_MARKERS = ["Im Detail", "Im Détail", "Nel dettaglio", "Argumente", "Arguments", "Abstimmungstext"]

    for idx in inkuerze_page_indices:
        pages_for_section = [pages[idx]]
        # Take following pages until we hit another "In Kürze" opener or a "Im Detail" page
        next_page_idx = idx + 1
        while next_page_idx < len(pages):
            next_text = pages[next_page_idx]
            if next_page_idx in inkuerze_page_indices:
                break
            if any(m in next_text[:150] for m in NEXT_SECTION_MARKERS):
                break
            if marker in next_text and context_key in next_text:
                break
            pages_for_section.append(next_text)
            next_page_idx += 1
            if len(pages_for_section) >= 3:  # cap at 3 pages per summary
                break

        combined = "\n\n".join(pages_for_section)
        sections.append(clean_text(combined))

    # Fallback: if we found too few/many, trim or pad to n_proposals
    if len(sections) == n_proposals:
        return sections

    if len(sections) > n_proposals:
        return sections[:n_proposals]

    # Fallback: equal page split (skip first 3 intro pages)
    body = pages[3:] if len(pages) > 6 else pages
    chunk = max(1, len(body) // n_proposals)
    return [clean_text("\n\n".join(body[i * chunk:(i + 1) * chunk])) for i in range(n_proposals)]


def extract_recommendation(pages: list[str], proposal_idx: int, n_proposals: int, lang: str) -> str | None:
    """
    Extract government recommendation for proposal at proposal_idx.
    Returns 'accept', 'reject', or None.
    """
    full_text = "\n".join(pages)

    # Strategy 1: modern format — "empfehlen ... anzunehmen/abzulehnen"
    accept_pat = EMPFEHLUNG_ACCEPT.get(lang, EMPFEHLUNG_ACCEPT["de"])
    reject_pat = EMPFEHLUNG_REJECT.get(lang, EMPFEHLUNG_REJECT["de"])

    # Find all accept/reject mentions and pick the one at the right position
    accepts = [(m.start(), "accept") for m in re.finditer(accept_pat, full_text, re.S | re.I)]
    rejects = [(m.start(), "reject") for m in re.finditer(reject_pat, full_text, re.S | re.I)]
    all_recs = sorted(accepts + rejects, key=lambda x: x[0])

    if len(all_recs) >= n_proposals and proposal_idx < len(all_recs):
        return all_recs[proposal_idx][1]
    if all_recs:
        return all_recs[min(proposal_idx, len(all_recs) - 1)][1]

    # Strategy 2: older format — "Empfehlung\n...\nJa/Nein" blocks
    old_yes = [(m.start(), "accept") for m in re.finditer(EMPFEHLUNG_OLD_YES, full_text, re.S)]
    old_no  = [(m.start(), "reject") for m in re.finditer(EMPFEHLUNG_OLD_NO, full_text, re.S)]
    old_all = sorted(old_yes + old_no, key=lambda x: x[0])

    if old_all and proposal_idx < len(old_all):
        return old_all[proposal_idx][1]
    if old_all:
        return old_all[0][1]

    return None


def load_index() -> list[dict]:
    return json.loads(INDEX_FILE.read_text()) if INDEX_FILE.exists() else []


def load_votation_json(date: str) -> dict | None:
    path = OUT_DIR / f"{date}.json"
    return json.loads(path.read_text()) if path.exists() else None


def get_proposals(votation: dict) -> list[dict]:
    schweiz = votation.get("schweiz", votation)
    vorlagen = schweiz.get("vorlagen", [])
    return sorted(
        [
            {
                "vorlagenId": v["vorlagenId"],
                **{f"title_{k}": next((t["text"] for t in v.get("vorlagenTitel", []) if t["langKey"] == k), "") for k in ("de", "fr", "it", "en", "rm")},
            }
            for v in vorlagen
        ],
        key=lambda p: p["vorlagenId"],
    )


def process_date(date: str, pdf_maps: dict[str, dict], force: bool = False) -> bool:
    out_path = OUT_DIR / f"{date}_erlaeuterungen.json"
    if out_path.exists() and not force:
        print(f"  {date}_erlaeuterungen.json already exists (--force to redo)")
        return True

    votation = load_votation_json(date)
    if votation is None:
        print(f"  {date}: votation JSON missing — run download_votations.py first")
        return False

    proposals = get_proposals(votation)
    n = len(proposals)
    print(f"  {date}: {n} proposal(s)")

    # Download and extract per language
    lang_data: dict[str, dict] = {}  # lang → {pages, inkuerze_sections}
    pdf_urls: dict[str, str] = {}

    for lang in ("de", "fr", "it"):
        pmap = pdf_maps.get(lang, {})
        if date not in pmap:
            continue
        url = pmap[date]
        pdf_path = download_pdf(date, url, lang, force=force)
        if pdf_path is None:
            continue
        pages = extract_pages(pdf_path)
        sections = extract_inkuerze(pages, n, lang)
        lang_data[lang] = {"pages": pages, "sections": sections}
        pdf_urls[lang] = url

    if not lang_data:
        print(f"  {date}: no PDFs available")
        return False

    # Build output
    output: dict = {"date": date, "pdf_urls": pdf_urls, "proposals": []}

    primary_lang = next(iter(lang_data))  # usually "de"
    primary_pages = lang_data[primary_lang]["pages"]

    for i, proposal in enumerate(proposals):
        entry: dict = {
            "vorlagenId": proposal["vorlagenId"],
            **{f"title_{k}": proposal[f"title_{k}"] for k in ("de", "fr", "it", "en", "rm")},
            "gov_rec": extract_recommendation(primary_pages, i, n, primary_lang),
        }
        for lang, ld in lang_data.items():
            sections = ld["sections"]
            entry[f"inkuerze_{lang}"] = sections[i] if i < len(sections) else ""

        output["proposals"].append(entry)

    out_path.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    print(f"  Saved {out_path.name}")
    return True


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", metavar="DATE")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    print("Scraping BK pages for PDF links (DE / FR / IT)…")
    pdf_maps: dict[str, dict] = {}
    for lang in ("de", "fr", "it"):
        m = scrape_bk_pdf_map(lang)
        pdf_maps[lang] = m
        print(f"  {lang.upper()}: {len(m)} dates")

    if args.date:
        dates = [args.date]
    else:
        index = load_index()
        dates = [e["date"] for e in index]
        print(f"\nProcessing {len(dates)} date(s)")

    ok = skipped = 0
    for date in dates:
        print(f"\n{date}:")
        if process_date(date, pdf_maps, force=args.force):
            ok += 1
        else:
            skipped += 1
        time.sleep(0.3)

    print(f"\nDone. {ok} processed, {skipped} skipped.")


if __name__ == "__main__":
    main()
