export interface ErlaeuterungenProposal {
  vorlagenId: number
  title_de: string
  title_fr: string
  title_it: string
  title_en: string
  title_rm: string
  gov_rec: 'accept' | 'reject' | null
  inkuerze_de: string
  inkuerze_fr: string
  inkuerze_it: string
  // pdf_urls lives on the parent
}

export interface ErlaeuterungenData {
  date: string
  pdf_urls: { de?: string; fr?: string; it?: string }
  proposals: ErlaeuterungenProposal[]
}

/**
 * Route through Google Docs viewer so the PDF opens in-browser instead of downloading.
 * BK sends Content-Disposition: attachment on all its PDFs — the viewer fetches it server-side.
 */
export function pdfViewUrl(url: string): string {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}`
}

export async function fetchErlaeuterungen(date: string): Promise<ErlaeuterungenData | null> {
  try {
    const resp = await fetch(`/votations/${date}_erlaeuterungen.json`)
    if (!resp.ok) return null
    return resp.json()
  } catch {
    return null
  }
}

export function getInkuerze(
  proposal: ErlaeuterungenProposal,
  lang: string,
): string {
  const key = `inkuerze_${lang}` as keyof ErlaeuterungenProposal
  const text = (proposal[key] as string) || proposal.inkuerze_de || ''
  return cleanInkuerze(text)
}

function cleanInkuerze(raw: string): string {
  return raw
    .replace(/\bIn Kürze\b|\bEn bref\b|\bIn breve\b/g, '')
    .replace(/^\d+\s+(Erste|Zweite|Dritte|Vierte|Fünfte|Premier|Deuxième|Troisième|Quatrième|Primo|Secondo|Terzo|Quarto)\s+Vorlage[:\s].+/gm, '')
    .replace(/^\d+\s+(objet|oggetto)[:\s].+/gim, '')
    .replace(/^[\d\s]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
