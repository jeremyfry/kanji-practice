import { Hono } from 'hono'
import { db, newCardRow } from './db.ts'
import type { VocabRow } from './db.ts'
import { getNextWord, applyRating } from './srs.ts'
import { generateSentence, invalidateVocabCache } from './sentence-gen.ts'
import { Rating } from 'ts-fsrs'

const VALID_RATINGS = new Set([Rating.Again, Rating.Hard, Rating.Good, Rating.Easy])

export const routes = new Hono()

// ── Review ────────────────────────────────────────────────────────────────────

// GET /api/review/next
// Returns the next word + a freshly generated sentence. Slowest endpoint (~1s)
// because it calls Claude. Returns 204 if there are no words in the DB yet.
routes.get('/review/next', async (c) => {
  const next = getNextWord()
  if (!next) return c.body(null, 204)

  let sentence
  try {
    sentence = await generateSentence(next.word, next.reading, next.meaning)
  } catch (e) {
    console.error('Sentence generation failed:', e)
    return c.json({ error: 'Failed to generate sentence', detail: String(e) }, 502)
  }

  return c.json({
    word:          next.word,
    reading:       next.reading,
    meaning:       next.meaning,
    dueCount:      next.dueCount,
    annotated:     sentence.annotated,
    translation:   sentence.translation,
    targetSurface: sentence.targetSurface,
  })
})

// POST /api/review/:word  { rating: 1|2|3|4 }
routes.post('/review/:word', async (c) => {
  const word = decodeURIComponent(c.req.param('word'))
  const body = await c.req.json<{ rating: number }>()

  if (!VALID_RATINGS.has(body.rating)) {
    return c.json({ error: 'invalid rating' }, 400)
  }

  applyRating(word, body.rating)
  return c.json({ ok: true })
})

// ── Vocab ─────────────────────────────────────────────────────────────────────

// GET /api/vocab
routes.get('/vocab', (c) => {
  const rows = db.prepare<[], VocabRow>('SELECT word, reading, meaning FROM vocab ORDER BY word').all()
  return c.json(rows)
})

// POST /api/vocab  { words: Array<{ word, reading, meaning }> }
// Inserts new vocab + creates SRS cards for them. Ignores duplicates.
routes.post('/vocab', async (c) => {
  const { words } = await c.req.json<{ words: VocabRow[] }>()
  if (!Array.isArray(words) || words.length === 0) {
    return c.json({ error: 'words array required' }, 400)
  }

  const insertVocab = db.prepare('INSERT OR IGNORE INTO vocab (word, reading, meaning) VALUES (?, ?, ?)')
  const insertCard  = db.prepare('INSERT OR IGNORE INTO srs_cards (word, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, learning_steps, state) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)')

  const now = Date.now()
  let added = 0

  const run = db.transaction(() => {
    for (const { word, reading, meaning } of words) {
      if (!word || !reading || !meaning) continue
      const result = insertVocab.run(word, reading, meaning)
      if (result.changes > 0) {
        insertCard.run(word, now)
        added++
      }
    }
  })
  run()

  if (added > 0) invalidateVocabCache()

  return c.json({ added })
})

// ── Pending words ─────────────────────────────────────────────────────────────

// GET /api/pending
routes.get('/pending', (c) => {
  const rows = db.prepare<[], { word: string }>('SELECT word FROM pending_words ORDER BY added_at').all()
  return c.json(rows.map(r => r.word))
})

// POST /api/pending  { word: string }
routes.post('/pending', async (c) => {
  const { word } = await c.req.json<{ word: string }>()
  if (!word?.trim()) return c.json({ error: 'word required' }, 400)
  db.prepare('INSERT OR IGNORE INTO pending_words (word) VALUES (?)').run(word.trim())
  return c.json({ ok: true })
})

// DELETE /api/pending  { word?: string }
// Omit word to clear all; include word to remove one.
routes.delete('/pending', async (c) => {
  let body: { word?: string } = {}
  try { body = await c.req.json() } catch { /* empty body = clear all */ }

  if (body.word) {
    db.prepare('DELETE FROM pending_words WHERE word = ?').run(body.word)
  } else {
    db.prepare('DELETE FROM pending_words').run()
  }
  return c.json({ ok: true })
})
