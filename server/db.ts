import Database from 'better-sqlite3'
import { createEmptyCard } from 'ts-fsrs'
import type { Card, State } from 'ts-fsrs'

const DB_PATH = process.env.DB_PATH ?? 'kanji.db'
export const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS vocab (
    word    TEXT PRIMARY KEY,
    reading TEXT NOT NULL,
    meaning TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch() * 1000)
  );

  CREATE TABLE IF NOT EXISTS srs_cards (
    word           TEXT PRIMARY KEY REFERENCES vocab(word) ON DELETE CASCADE,
    due            INTEGER NOT NULL,
    stability      REAL    NOT NULL DEFAULT 0,
    difficulty     REAL    NOT NULL DEFAULT 0,
    elapsed_days   INTEGER NOT NULL DEFAULT 0,
    scheduled_days INTEGER NOT NULL DEFAULT 0,
    reps           INTEGER NOT NULL DEFAULT 0,
    lapses         INTEGER NOT NULL DEFAULT 0,
    learning_steps INTEGER NOT NULL DEFAULT 0,
    state          INTEGER NOT NULL DEFAULT 0,
    last_review    INTEGER
  );

  CREATE TABLE IF NOT EXISTS pending_words (
    word     TEXT PRIMARY KEY,
    added_at INTEGER DEFAULT (unixepoch() * 1000)
  );
`)

export interface VocabRow {
  word: string
  reading: string
  meaning: string
}

export interface SrsCardRow {
  word:           string
  due:            number        // epoch ms
  stability:      number
  difficulty:     number
  elapsed_days:   number
  scheduled_days: number
  reps:           number
  lapses:         number
  learning_steps: number
  state:          number        // 0=New 1=Learning 2=Review 3=Relearning
  last_review:    number | null // epoch ms
}

export function rowToCard(row: SrsCardRow): Card {
  return {
    due:            new Date(row.due),
    stability:      row.stability,
    difficulty:     row.difficulty,
    elapsed_days:   row.elapsed_days,
    scheduled_days: row.scheduled_days,
    reps:           row.reps,
    lapses:         row.lapses,
    learning_steps: row.learning_steps,
    state:          row.state as State,
    last_review:    row.last_review != null ? new Date(row.last_review) : undefined as unknown as Date,
  }
}

export function cardToRow(card: Card): Omit<SrsCardRow, 'word'> {
  return {
    due:            card.due.getTime(),
    stability:      card.stability,
    difficulty:     card.difficulty,
    elapsed_days:   card.elapsed_days,
    scheduled_days: card.scheduled_days,
    reps:           card.reps,
    lapses:         card.lapses,
    learning_steps: card.learning_steps ?? 0,
    state:          card.state as number,
    last_review:    card.last_review ? card.last_review.getTime() : null,
  }
}

export function newCardRow(word: string): SrsCardRow {
  const card = createEmptyCard()
  return { word, ...cardToRow(card) }
}
