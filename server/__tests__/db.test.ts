import { describe, it, expect } from 'vitest'
import { rowToCard, cardToRow, newCardRow } from '../db.ts'
import type { SrsCardRow } from '../db.ts'

const BASE_ROW: SrsCardRow = {
  word:           'テスト',
  due:            1700000000000,
  stability:      1.5,
  difficulty:     5.5,
  elapsed_days:   3,
  scheduled_days: 7,
  reps:           2,
  lapses:         0,
  learning_steps: 1,
  state:          2, // Review
  last_review:    1699000000000,
}

describe('rowToCard', () => {
  it('converts due epoch ms to a Date', () => {
    const card = rowToCard(BASE_ROW)
    expect(card.due).toBeInstanceOf(Date)
    expect(card.due.getTime()).toBe(BASE_ROW.due)
  })

  it('converts last_review epoch ms to a Date', () => {
    const card = rowToCard(BASE_ROW)
    expect(card.last_review).toBeInstanceOf(Date)
    expect(card.last_review!.getTime()).toBe(BASE_ROW.last_review)
  })

  it('handles null last_review without throwing', () => {
    const card = rowToCard({ ...BASE_ROW, last_review: null })
    expect(card.last_review).toBeFalsy()
  })

  it('passes through all numeric fields unchanged', () => {
    const card = rowToCard(BASE_ROW)
    expect(card.stability).toBe(BASE_ROW.stability)
    expect(card.difficulty).toBe(BASE_ROW.difficulty)
    expect(card.elapsed_days).toBe(BASE_ROW.elapsed_days)
    expect(card.scheduled_days).toBe(BASE_ROW.scheduled_days)
    expect(card.reps).toBe(BASE_ROW.reps)
    expect(card.lapses).toBe(BASE_ROW.lapses)
    expect(card.state).toBe(BASE_ROW.state)
  })
})

describe('cardToRow', () => {
  it('converts due Date back to epoch ms', () => {
    const row = cardToRow(rowToCard(BASE_ROW))
    expect(row.due).toBe(BASE_ROW.due)
  })

  it('converts last_review Date back to epoch ms', () => {
    const row = cardToRow(rowToCard(BASE_ROW))
    expect(row.last_review).toBe(BASE_ROW.last_review)
  })

  it('round-trips all fields losslessly', () => {
    const row = cardToRow(rowToCard(BASE_ROW))
    expect(row.stability).toBe(BASE_ROW.stability)
    expect(row.difficulty).toBe(BASE_ROW.difficulty)
    expect(row.elapsed_days).toBe(BASE_ROW.elapsed_days)
    expect(row.scheduled_days).toBe(BASE_ROW.scheduled_days)
    expect(row.reps).toBe(BASE_ROW.reps)
    expect(row.lapses).toBe(BASE_ROW.lapses)
    expect(row.state).toBe(BASE_ROW.state)
  })

  it('sets last_review to null when card has no last_review', () => {
    const card = rowToCard({ ...BASE_ROW, last_review: null })
    const row = cardToRow(card)
    expect(row.last_review).toBeNull()
  })
})

describe('newCardRow', () => {
  it('sets the word field', () => {
    const row = newCardRow('新しい')
    expect(row.word).toBe('新しい')
  })

  it('starts with zero reps, lapses, and state=New', () => {
    const row = newCardRow('新しい')
    expect(row.reps).toBe(0)
    expect(row.lapses).toBe(0)
    expect(row.state).toBe(0) // State.New
  })

  it('sets due as a numeric epoch ms timestamp', () => {
    const before = Date.now()
    const row = newCardRow('新しい')
    const after = Date.now()
    expect(row.due).toBeTypeOf('number')
    expect(row.due).toBeGreaterThanOrEqual(before)
    expect(row.due).toBeLessThanOrEqual(after)
  })
})
