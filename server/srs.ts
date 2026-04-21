import { fsrs, generatorParameters } from 'ts-fsrs'
import type { Grade } from 'ts-fsrs'
import { db, rowToCard, cardToRow } from './db.ts'
import type { VocabRow, SrsCardRow } from './db.ts'

export type { Grade }

const f = fsrs(generatorParameters({ enable_fuzz: true }))

export interface ReviewWord extends VocabRow {
  dueCount: number
}

// Pick the next word to review, prioritising due cards.
// Returns null only if vocab table is empty.
export function getNextWord(): ReviewWord | null {
  const now = Date.now()

  const dueCount: number =
    (db.prepare<[number], { c: number }>('SELECT COUNT(*) as c FROM srs_cards WHERE due <= ?').get(now)?.c ?? 0)

  // Pick a random due card first
  const row = db
    .prepare<[number], VocabRow & { state: number }>(`
      SELECT v.word, v.reading, v.meaning, c.state
      FROM vocab v
      JOIN srs_cards c ON c.word = v.word
      WHERE c.due <= ?
      ORDER BY RANDOM()
      LIMIT 1
    `)
    .get(now)

  if (row) return { word: row.word, reading: row.reading, meaning: row.meaning, dueCount }

  // Nothing due — pick any word at random
  const any = db
    .prepare<[], VocabRow>(`
      SELECT v.word, v.reading, v.meaning
      FROM vocab v
      JOIN srs_cards c ON c.word = v.word
      ORDER BY RANDOM()
      LIMIT 1
    `)
    .get()

  if (!any) return null
  return { ...any, dueCount: 0 }
}

export function applyRating(word: string, rating: Grade): void {
  const row = db
    .prepare<[string], SrsCardRow>('SELECT * FROM srs_cards WHERE word = ?')
    .get(word)

  if (!row) return

  const card = rowToCard(row)
  const { card: updated } = f.next(card, new Date(), rating)
  const fields = cardToRow(updated)

  db.prepare(`
    UPDATE srs_cards
    SET due = ?, stability = ?, difficulty = ?, elapsed_days = ?,
        scheduled_days = ?, reps = ?, lapses = ?, learning_steps = ?,
        state = ?, last_review = ?
    WHERE word = ?
  `).run(
    fields.due, fields.stability, fields.difficulty, fields.elapsed_days,
    fields.scheduled_days, fields.reps, fields.lapses, fields.learning_steps,
    fields.state, fields.last_review, word,
  )
}
