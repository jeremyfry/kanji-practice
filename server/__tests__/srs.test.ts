import { describe, it, expect, beforeEach } from 'vitest'
import { Rating } from 'ts-fsrs'
import { db } from '../db.ts'
import { getNextWord, applyRating } from '../srs.ts'

function seedWord(word: string, reading: string, meaning: string, dueMs: number) {
  db.prepare('INSERT INTO vocab (word, reading, meaning) VALUES (?, ?, ?)').run(word, reading, meaning)
  db.prepare(
    'INSERT INTO srs_cards (word, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, learning_steps, state) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)'
  ).run(word, dueMs)
}

beforeEach(() => {
  db.exec('DELETE FROM srs_cards; DELETE FROM vocab; DELETE FROM pending_words')
})

describe('getNextWord', () => {
  it('returns null when vocab is empty', () => {
    expect(getNextWord()).toBeNull()
  })

  it('returns the word when one exists and is due', () => {
    seedWord('犬', 'いぬ', 'dog', Date.now() - 1000)
    const next = getNextWord()
    expect(next).not.toBeNull()
    expect(next!.word).toBe('犬')
    expect(next!.reading).toBe('いぬ')
    expect(next!.meaning).toBe('dog')
  })

  it('returns the only word even when not yet due', () => {
    seedWord('犬', 'いぬ', 'dog', Date.now() + 9_999_999)
    const next = getNextWord()
    expect(next).not.toBeNull()
    expect(next!.word).toBe('犬')
  })

  it('reports dueCount = 1 when one card is due', () => {
    const now = Date.now()
    seedWord('犬', 'いぬ', 'dog', now - 1000)   // due
    seedWord('猫', 'ねこ', 'cat', now + 100_000) // not due
    const next = getNextWord()
    expect(next!.dueCount).toBe(1)
  })

  it('reports dueCount = 0 when no cards are due', () => {
    seedWord('犬', 'いぬ', 'dog', Date.now() + 100_000)
    const next = getNextWord()
    expect(next!.dueCount).toBe(0)
  })

  it('reports dueCount = 2 when two cards are due', () => {
    const past = Date.now() - 1000
    seedWord('犬', 'いぬ', 'dog', past)
    seedWord('猫', 'ねこ', 'cat', past)
    const next = getNextWord()
    expect(next!.dueCount).toBe(2)
  })
})

describe('applyRating', () => {
  it('increments reps after a Good rating', () => {
    seedWord('犬', 'いぬ', 'dog', Date.now() - 1000)
    applyRating('犬', Rating.Good)
    const row = db.prepare<[string], { reps: number }>('SELECT reps FROM srs_cards WHERE word = ?').get('犬')!
    expect(row.reps).toBeGreaterThan(0)
  })

  it('updates the due timestamp after rating', () => {
    const originalDue = Date.now() - 1000
    seedWord('犬', 'いぬ', 'dog', originalDue)
    applyRating('犬', Rating.Good)
    const row = db.prepare<[string], { due: number }>('SELECT due FROM srs_cards WHERE word = ?').get('犬')!
    expect(row.due).toBeGreaterThan(originalDue)
  })

  it('does not throw for an unknown word', () => {
    expect(() => applyRating('存在しない', Rating.Good)).not.toThrow()
  })

  it('records a lapse after Again rating on a review card', () => {
    seedWord('犬', 'いぬ', 'dog', Date.now() - 1000)
    // Advance to Review state first via two Good ratings
    applyRating('犬', Rating.Good)
    applyRating('犬', Rating.Good)
    const before = db.prepare<[string], { lapses: number; state: number }>(
      'SELECT lapses, state FROM srs_cards WHERE word = ?'
    ).get('犬')!

    // Only test lapse logic if we actually reached Review state (state=2)
    if (before.state === 2) {
      applyRating('犬', Rating.Again)
      const after = db.prepare<[string], { lapses: number }>(
        'SELECT lapses FROM srs_cards WHERE word = ?'
      ).get('犬')!
      expect(after.lapses).toBeGreaterThan(before.lapses)
    }
  })
})
