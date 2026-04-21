import { useState, useEffect, useCallback, useLayoutEffect } from 'react'
import { Rating } from 'ts-fsrs'
import type { Grade } from 'ts-fsrs'
import { SentenceDisplay } from './components/SentenceDisplay'
import { RatingButtons } from './components/RatingButtons'
import { PendingWords } from './components/PendingWords'
import { getPendingWords } from './utils/pendingWords'

interface VocabEntry {
  word:    string
  reading: string
  meaning: string
}

interface ReviewCard {
  word:          string
  reading:       string
  meaning:       string
  dueCount:      number
  annotated:     string
  translation:   string
  targetSurface: string
  sentenceVocab: VocabEntry[]
}

type AppState =
  | { kind: 'loading' }
  | { kind: 'card'; card: ReviewCard; rating: boolean }
  | { kind: 'empty' }
  | { kind: 'error'; message: string }

async function fetchNextCard(): Promise<ReviewCard | null> {
  const res = await fetch('/api/review/next')
  if (res.status === 204) return null
  if (!res.ok) throw new Error(`Server error ${res.status}`)
  return res.json()
}

async function submitRating(word: string, rating: Grade): Promise<void> {
  const res = await fetch(`/api/review/${encodeURIComponent(word)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating }),
  })
  if (!res.ok) throw new Error(`Rating failed ${res.status}`)
}

export default function App() {
  const [appState, setAppState] = useState<AppState>({ kind: 'loading' })
  const [dueCount, setDueCount]   = useState(0)
  const [pending, setPending]     = useState<string[]>([])
  type FontStyle = 'gothic' | 'mincho' | 'cursive'
  const [font, setFont] = useState<FontStyle>(
    () => (localStorage.getItem('font') as FontStyle) ?? 'gothic'
  )

  useLayoutEffect(() => {
    document.body.classList.remove('font-mincho', 'font-cursive')
    if (font === 'mincho')  document.body.classList.add('font-mincho')
    if (font === 'cursive') document.body.classList.add('font-cursive')
    localStorage.setItem('font', font)
  }, [font])

  const [showFurigana, setShowFurigana]       = useState(false)
  const [showTranslation, setShowTranslation] = useState(false)
  const [showVocab, setShowVocab]             = useState(false)

  const refreshPending = async () => setPending(await getPendingWords())

  const loadNext = useCallback(async () => {
    setAppState({ kind: 'loading' })
    setShowFurigana(false)
    setShowTranslation(false)
    setShowVocab(false)
    try {
      const card = await fetchNextCard()
      if (!card) {
        setAppState({ kind: 'empty' })
        setDueCount(0)
      } else {
        setDueCount(card.dueCount)
        setAppState({ kind: 'card', card, rating: false })
      }
    } catch (e) {
      setAppState({ kind: 'error', message: (e as Error).message })
    }
  }, [])

  useEffect(() => {
    loadNext()
    refreshPending()
  }, [loadNext])

  const handleRate = useCallback(async (rating: Grade) => {
    if (appState.kind !== 'card') return
    const { card } = appState

    // Immediately lock the buttons to prevent double-tap
    setAppState({ kind: 'card', card, rating: true })

    try {
      await submitRating(card.word, rating)
    } catch (e) {
      setAppState({ kind: 'error', message: (e as Error).message })
      return
    }

    loadNext()
  }, [appState, loadNext])

  const dueLabel = dueCount > 0 ? `${dueCount} due` : 'all caught up'

  return (
    <div className="app">
      <header>
        <h1>漢字練習</h1>
        <p className="subtitle">{dueLabel}</p>
        <div className="font-switcher">
          <button className={`font-btn${font === 'gothic'  ? ' active' : ''}`} onClick={() => setFont('gothic')}>ゴシック</button>
          <button className={`font-btn${font === 'mincho'  ? ' active' : ''}`} onClick={() => setFont('mincho')}>明朝</button>
          <button className={`font-btn${font === 'cursive' ? ' active' : ''}`} onClick={() => setFont('cursive')}>手書き</button>
        </div>
      </header>

      <main>
        {appState.kind === 'loading' && (
          <div className="loading">
            <div className="spinner" />
            <span>Generating...</span>
          </div>
        )}

        {appState.kind === 'error' && (
          <div className="error">
            <p>{appState.message}</p>
            <button className="generate-btn" style={{ marginTop: '1rem' }} onClick={loadNext}>
              Retry
            </button>
          </div>
        )}

        {appState.kind === 'empty' && (
          <div className="review-done">
            <p>No words in the database yet.</p>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>
              Add words via the panel below or run <code>/import-vocab</code>.
            </p>
          </div>
        )}

        {appState.kind === 'card' && (
          <>
            <SentenceDisplay
              annotated={appState.card.annotated}
              translation={appState.card.translation}
              targetSurface={appState.card.targetSurface}
              sentenceVocab={appState.card.sentenceVocab}
              showFurigana={showFurigana}
              showTranslation={showTranslation}
              showVocab={showVocab}
              onToggleFurigana={() => setShowFurigana(v => !v)}
              onToggleTranslation={() => setShowTranslation(v => !v)}
              onToggleVocab={() => setShowVocab(v => !v)}
            />
            <RatingButtons onRate={handleRate} disabled={appState.rating} />
          </>
        )}

        <PendingWords pending={pending} onUpdate={refreshPending} />
      </main>
    </div>
  )
}
