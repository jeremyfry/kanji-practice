import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../sentence-gen.ts', () => ({
  generateSentence: vi.fn().mockResolvedValue({
    annotated:     '{テスト|てすと}の{文|ぶん}',
    translation:   'A test sentence.',
    targetSurface: 'テスト',
    vocabUsed:     ['テスト'],
  }),
  invalidateVocabCache: vi.fn(),
}))

import { routes } from '../routes.ts'
import { db } from '../db.ts'

beforeEach(() => {
  db.exec('DELETE FROM srs_cards; DELETE FROM vocab; DELETE FROM pending_words')
})

// ── helpers ──────────────────────────────────────────────────────────────────

function post(path: string, body: unknown) {
  return routes.request(path, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })
}

function del(path: string, body?: unknown) {
  return routes.request(path, {
    method:  'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body:    body !== undefined ? JSON.stringify(body) : undefined,
  })
}

function seedWord(word: string, reading: string, meaning: string) {
  db.prepare('INSERT INTO vocab (word, reading, meaning) VALUES (?, ?, ?)').run(word, reading, meaning)
  db.prepare(
    'INSERT INTO srs_cards (word, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, learning_steps, state) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)'
  ).run(word, Date.now() - 1000)
}

// ── GET /api/vocab ────────────────────────────────────────────────────────────

describe('GET /vocab', () => {
  it('returns an empty list when no vocab exists', async () => {
    const res = await routes.request('/vocab')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns all seeded vocab words', async () => {
    seedWord('犬', 'いぬ', 'dog')
    seedWord('猫', 'ねこ', 'cat')
    const res = await routes.request('/vocab')
    const data = await res.json() as { word: string }[]
    expect(data).toHaveLength(2)
    expect(data.map(d => d.word).sort()).toEqual(['犬', '猫'])
  })
})

// ── POST /api/vocab ───────────────────────────────────────────────────────────

describe('POST /vocab', () => {
  it('inserts a new word and returns added count', async () => {
    const res = await post('/vocab', { words: [{ word: '犬', reading: 'いぬ', meaning: 'dog' }] })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ added: 1 })
  })

  it('ignores duplicate words', async () => {
    seedWord('犬', 'いぬ', 'dog')
    const res = await post('/vocab', { words: [{ word: '犬', reading: 'いぬ', meaning: 'dog' }] })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ added: 0 })
  })

  it('creates an srs_card for each new word', async () => {
    await post('/vocab', { words: [{ word: '猫', reading: 'ねこ', meaning: 'cat' }] })
    const card = db.prepare('SELECT word FROM srs_cards WHERE word = ?').get('猫')
    expect(card).toBeTruthy()
  })

  it('returns 400 when words array is missing', async () => {
    const res = await post('/vocab', {})
    expect(res.status).toBe(400)
  })

  it('returns 400 when words array is empty', async () => {
    const res = await post('/vocab', { words: [] })
    expect(res.status).toBe(400)
  })

  it('skips entries missing required fields', async () => {
    const res = await post('/vocab', {
      words: [
        { word: '犬', reading: 'いぬ', meaning: 'dog' },
        { word: '', reading: 'いぬ', meaning: 'dog' }, // empty word
        { word: '猫', reading: '', meaning: 'cat' },   // empty reading
      ],
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ added: 1 })
  })
})

// ── GET /api/pending ──────────────────────────────────────────────────────────

describe('GET /pending', () => {
  it('returns empty list when no pending words', async () => {
    const res = await routes.request('/pending')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it('returns added pending words', async () => {
    db.prepare("INSERT INTO pending_words (word) VALUES ('覚える')").run()
    const res = await routes.request('/pending')
    expect(await res.json()).toEqual(['覚える'])
  })
})

// ── POST /api/pending ─────────────────────────────────────────────────────────

describe('POST /pending', () => {
  it('adds a word and returns ok', async () => {
    const res = await post('/pending', { word: '覚える' })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
    const row = db.prepare("SELECT word FROM pending_words WHERE word = '覚える'").get()
    expect(row).toBeTruthy()
  })

  it('returns 400 when word is empty', async () => {
    const res = await post('/pending', { word: '' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when word is missing', async () => {
    const res = await post('/pending', {})
    expect(res.status).toBe(400)
  })

  it('ignores duplicates silently', async () => {
    await post('/pending', { word: '覚える' })
    const res = await post('/pending', { word: '覚える' })
    expect(res.status).toBe(200)
    const count = db.prepare("SELECT COUNT(*) as c FROM pending_words WHERE word = '覚える'").get() as { c: number }
    expect(count.c).toBe(1)
  })

  it('trims whitespace from word before saving', async () => {
    await post('/pending', { word: '  覚える  ' })
    const row = db.prepare("SELECT word FROM pending_words WHERE word = '覚える'").get()
    expect(row).toBeTruthy()
  })
})

// ── DELETE /api/pending ───────────────────────────────────────────────────────

describe('DELETE /pending', () => {
  it('removes a specific word', async () => {
    db.prepare("INSERT INTO pending_words (word) VALUES ('覚える')").run()
    db.prepare("INSERT INTO pending_words (word) VALUES ('忘れる')").run()
    const res = await del('/pending', { word: '覚える' })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
    const count = db.prepare('SELECT COUNT(*) as c FROM pending_words').get() as { c: number }
    expect(count.c).toBe(1)
  })

  it('clears all pending words when no word specified', async () => {
    db.prepare("INSERT INTO pending_words (word) VALUES ('覚える')").run()
    db.prepare("INSERT INTO pending_words (word) VALUES ('忘れる')").run()
    const res = await del('/pending')
    expect(res.status).toBe(200)
    const count = db.prepare('SELECT COUNT(*) as c FROM pending_words').get() as { c: number }
    expect(count.c).toBe(0)
  })
})

// ── POST /api/review/:word ────────────────────────────────────────────────────

describe('POST /review/:word', () => {
  it('returns 400 for rating 0', async () => {
    seedWord('犬', 'いぬ', 'dog')
    const res = await post('/review/%E7%8A%AC', { rating: 0 })
    expect(res.status).toBe(400)
  })

  it('returns 400 for rating 5', async () => {
    seedWord('犬', 'いぬ', 'dog')
    const res = await post('/review/%E7%8A%AC', { rating: 5 })
    expect(res.status).toBe(400)
  })

  it('accepts rating 1 (Again)', async () => {
    seedWord('犬', 'いぬ', 'dog')
    const res = await post('/review/%E7%8A%AC', { rating: 1 })
    expect(res.status).toBe(200)
  })

  it('accepts rating 4 (Easy)', async () => {
    seedWord('犬', 'いぬ', 'dog')
    const res = await post('/review/%E7%8A%AC', { rating: 4 })
    expect(res.status).toBe(200)
  })

  it('updates the card state after a valid rating', async () => {
    seedWord('犬', 'いぬ', 'dog')
    const before = db.prepare<[string], { reps: number }>('SELECT reps FROM srs_cards WHERE word = ?').get('犬')!
    await post('/review/%E7%8A%AC', { rating: 3 })
    const after = db.prepare<[string], { reps: number }>('SELECT reps FROM srs_cards WHERE word = ?').get('犬')!
    expect(after.reps).toBeGreaterThan(before.reps)
  })
})

// ── GET /api/review/next ──────────────────────────────────────────────────────

describe('GET /review/next', () => {
  it('returns 204 when no vocab in DB', async () => {
    const res = await routes.request('/review/next')
    expect(res.status).toBe(204)
  })

  it('returns 200 with sentence data when vocab exists', async () => {
    seedWord('テスト', 'てすと', 'test')
    const res = await routes.request('/review/next')
    expect(res.status).toBe(200)
    const data = await res.json() as Record<string, unknown>
    expect(data.word).toBe('テスト')
    expect(data.annotated).toBeTypeOf('string')
    expect(data.translation).toBeTypeOf('string')
    expect(data.targetSurface).toBeTypeOf('string')
    expect(data.dueCount).toBeTypeOf('number')
    expect(Array.isArray(data.sentenceVocab)).toBe(true)
  })
})
