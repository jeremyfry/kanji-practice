/**
 * One-time DB seed from public/vocab.tsv.
 * Run with: npm run seed
 * Safe to re-run — uses INSERT OR IGNORE.
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { db } from './db.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const vocabPath = resolve(__dirname, '../public/vocab.tsv')

const lines = readFileSync(vocabPath, 'utf8').split('\n')

const insertVocab = db.prepare('INSERT OR IGNORE INTO vocab (word, reading, meaning) VALUES (?, ?, ?)')
const insertCard  = db.prepare(
  'INSERT OR IGNORE INTO srs_cards (word, due, stability, difficulty, elapsed_days, scheduled_days, reps, lapses, learning_steps, state) VALUES (?, ?, 0, 0, 0, 0, 0, 0, 0, 0)',
)

let inserted = 0
let skipped  = 0
const now = Date.now()

// Japanese character range (kanji + hiragana + katakana)
const JP_RE = /[\u3040-\u30ff\u4e00-\u9fff]/

const seed = db.transaction(() => {
  for (const line of lines) {
    const parts = line.split('\t')
    if (parts.length < 3) { skipped++; continue }

    const [word, reading, meaning] = parts.map(p => p.trim())
    if (!word || !reading || !meaning) { skipped++; continue }
    // Skip continuation lines that look like plain English
    if (!JP_RE.test(word)) { skipped++; continue }

    const result = insertVocab.run(word, reading, meaning)
    if (result.changes > 0) {
      insertCard.run(word, now)
      inserted++
    } else {
      skipped++
    }
  }
})

seed()
console.log(`Seed complete: ${inserted} words inserted, ${skipped} lines skipped.`)
