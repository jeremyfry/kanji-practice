import { describe, it, expect } from 'vitest'
import { parseAnnotated } from '../utils/parseSentences'

describe('parseAnnotated', () => {
  it('returns empty array for empty string', () => {
    expect(parseAnnotated('')).toEqual([])
  })

  it('parses plain text as a single segment with no reading', () => {
    expect(parseAnnotated('は')).toEqual([{ text: 'は', reading: null }])
  })

  it('parses a single annotated segment', () => {
    expect(parseAnnotated('{今日|きょう}')).toEqual([
      { text: '今日', reading: 'きょう' },
    ])
  })

  it('parses multiple consecutive annotated segments', () => {
    expect(parseAnnotated('{今日|きょう}{学校|がっこう}')).toEqual([
      { text: '今日', reading: 'きょう' },
      { text: '学校', reading: 'がっこう' },
    ])
  })

  it('parses mixed annotated and plain text', () => {
    expect(parseAnnotated('{今日|きょう}は{学校|がっこう}で')).toEqual([
      { text: '今日', reading: 'きょう' },
      { text: 'は', reading: null },
      { text: '学校', reading: 'がっこう' },
      { text: 'で', reading: null },
    ])
  })

  it('handles the canonical CLAUDE.md example', () => {
    expect(parseAnnotated('{今日|きょう}は{暑|あつ}い')).toEqual([
      { text: '今日', reading: 'きょう' },
      { text: 'は', reading: null },
      { text: '暑', reading: 'あつ' },
      { text: 'い', reading: null },
    ])
  })

  it('handles a sentence with only plain kana (no annotations)', () => {
    expect(parseAnnotated('きょうはあつい')).toEqual([
      { text: 'きょうはあつい', reading: null },
    ])
  })

  it('handles leading plain text before first annotation', () => {
    expect(parseAnnotated('今は{学校|がっこう}です')).toEqual([
      { text: '今は', reading: null },
      { text: '学校', reading: 'がっこう' },
      { text: 'です', reading: null },
    ])
  })

  it('handles annotation with compound kanji surface', () => {
    expect(parseAnnotated('{付けた|つけた}')).toEqual([
      { text: '付けた', reading: 'つけた' },
    ])
  })
})
