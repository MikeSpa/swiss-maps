import { describe, it, expect, vi } from 'vitest'
import { jsonFetch } from './fetch'

describe('jsonFetch', () => {
  it('returns the parsed JSON body on a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ hello: 'world' }),
      }),
    )
    await expect(jsonFetch('/data.json', 'failed')).resolves.toEqual({ hello: 'world' })
  })

  it('throws an error including the status on a non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve(null),
      }),
    )
    await expect(jsonFetch('/missing.json', 'Could not load')).rejects.toThrow('Could not load: 404')
  })
})
