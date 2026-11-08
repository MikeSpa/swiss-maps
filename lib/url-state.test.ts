import { describe, it, expect } from 'vitest'
import { parseUrlState, buildUrlSearch } from './url-state'

describe('parseUrlState', () => {
  it('parses all params', () => {
    expect(parseUrlState('?d=20260927&v=6880&c=5')).toEqual({
      date: '20260927',
      vorlageId: 6880,
      cantonNum: 5,
    })
  })

  it('returns nulls for an empty query', () => {
    expect(parseUrlState('')).toEqual({ date: null, vorlageId: null, cantonNum: null })
  })

  it('ignores malformed values', () => {
    expect(parseUrlState('?d=2026-09-27&v=abc&c=99')).toEqual({
      date: null,
      vorlageId: null,
      cantonNum: null,
    })
  })
})

describe('buildUrlSearch', () => {
  it('builds a query string and round-trips', () => {
    const state = { date: '20260927', vorlageId: 6880, cantonNum: 5 }
    expect(buildUrlSearch(state)).toBe('?d=20260927&v=6880&c=5')
    expect(parseUrlState(buildUrlSearch(state))).toEqual(state)
  })

  it('omits missing params', () => {
    expect(buildUrlSearch({ date: '20260927' })).toBe('?d=20260927')
    expect(buildUrlSearch({})).toBe('')
  })
})
