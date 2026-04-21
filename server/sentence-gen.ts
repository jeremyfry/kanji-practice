import Anthropic from '@anthropic-ai/sdk'
import { db } from './db.ts'
import type { VocabRow } from './db.ts'

const client = new Anthropic()

// In-memory vocab cache — rebuilt when vocab changes
let cachedVocab: VocabRow[] | null = null

export function invalidateVocabCache(): void {
  cachedVocab = null
}

function getVocab(): VocabRow[] {
  if (!cachedVocab) {
    cachedVocab = db.prepare<[], VocabRow>('SELECT word, reading, meaning FROM vocab ORDER BY word').all()
  }
  return cachedVocab
}

function buildSystemPrompt(vocab: VocabRow[]): string {
  const wordList = vocab
    .map(v => `${v.word}（${v.reading}）— ${v.meaning}`)
    .join('\n')

  return `You are a Japanese language tutor generating reading-comprehension practice sentences.

The student knows the following vocabulary:
${wordList}

When generating a sentence:
- Feature the requested target word naturally and prominently
- Use other words from the vocabulary list above as supporting vocabulary where it sounds natural
- Write at JLPT N4–N2 grammar level — clear and varied, not textbook-stilted
- In the "annotated" field, wrap every kanji-containing word as {surface|reading}
  Examples: {今日|きょう}、{付けた|つけた}、{友達|ともだち}
  Plain hiragana, katakana, and punctuation need no annotation
- In "targetSurface" return the exact surface text as it appears in "annotated" (e.g. "付けた", not "付ける")
- In "vocabUsed" return the dictionary forms (exactly as they appear in the vocabulary list above) of every word from the list that appears in the sentence, including the target word`
}

export interface GeneratedSentence {
  annotated:     string
  translation:   string
  targetSurface: string
  vocabUsed:     string[]
}

export async function generateSentence(
  word: string,
  reading: string,
  meaning: string,
): Promise<GeneratedSentence> {
  const vocab = getVocab()

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: [
      {
        type: 'text',
        text: buildSystemPrompt(vocab),
        // @ts-ignore — cache_control is supported but not yet in all SDK type versions
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Generate a practice sentence featuring this target word:

Word: ${word}（${reading}）— ${meaning}

Return only this JSON object, no other text:
{
  "annotated": "...",
  "translation": "...",
  "targetSurface": "...",
  "vocabUsed": ["...", "..."]
}`,
      },
    ],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
  // Strip markdown code fences if present
  const json = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const parsed = JSON.parse(json) as GeneratedSentence
  return parsed
}
