export async function jsonFetch<T>(url: string, errorMsg: string): Promise<T> {
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`${errorMsg}: ${resp.status}`)
  return resp.json()
}
