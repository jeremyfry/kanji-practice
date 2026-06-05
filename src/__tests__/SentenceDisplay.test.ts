import { describe, it, expect } from 'vitest'
import { isTargetSegment } from '../components/SentenceDisplay'
import type { Segment } from '../utils/parseSentences'

function seg(text: string, reading: string | null = null): Segment {
  return { text, reading }
}

describe('isTargetSegment', () => {
  it('matches when seg.text equals targetSurface exactly', () => {
    expect(isTargetSegment(seg('食べた', 'たべた'), '食べた', '食べる')).toBe(true)
  })

  it('matches when seg.text equals the base word (Claude returned wrong surface)', () => {
    expect(isTargetSegment(seg('食べる', 'たべる'), 'wrongSurface', '食べる')).toBe(true)
  })

  it('does not match an unrelated segment', () => {
    expect(isTargetSegment(seg('学校', 'がっこう'), '食べた', '食べる')).toBe(false)
  })

  it('matches a plain-text (unannotated) segment by targetSurface', () => {
    expect(isTargetSegment(seg('テスト'), 'テスト', 'テスト')).toBe(true)
  })

  it('does not match when neither targetSurface nor word equals seg.text', () => {
    expect(isTargetSegment(seg('今日', 'きょう'), '昨日', '昨日')).toBe(false)
  })

  it('handles empty strings without throwing', () => {
    expect(isTargetSegment(seg(''), '', '')).toBe(true)
  })
})
