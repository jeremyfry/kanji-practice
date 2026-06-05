import { parseAnnotated } from '../utils/parseSentences'
import type { Segment } from '../utils/parseSentences'

interface VocabEntry {
  word:    string
  reading: string
  meaning: string
}

export function isTargetSegment(seg: Segment, targetSurface: string, baseWord: string): boolean {
  if (seg.text === targetSurface) return true
  if (seg.text === baseWord) return true
  return false
}

interface Props {
  word:          string
  annotated:     string
  translation:   string
  targetSurface: string
  sentenceVocab: VocabEntry[]
  showFurigana:    boolean
  showTranslation: boolean
  showVocab:       boolean
  onToggleFurigana:    () => void
  onToggleTranslation: () => void
  onToggleVocab:       () => void
}

export function SentenceDisplay({
  word,
  annotated,
  translation,
  targetSurface,
  sentenceVocab,
  showFurigana,
  showTranslation,
  showVocab,
  onToggleFurigana,
  onToggleTranslation,
  onToggleVocab,
}: Props) {
  const segments = parseAnnotated(annotated)
  const targetWord = sentenceVocab[0]

  return (
    <div className="sentence-card">
      {targetWord && (
        <div className="target-banner">
          <span className="target-banner-word">{targetWord.word}</span>
          <span className="target-banner-reading">（{targetWord.reading}）</span>
        </div>
      )}

      <div className="sentence-text">
        {segments.map((seg, i) => {
          const isTarget = isTargetSegment(seg, targetSurface, word)
          if (seg.reading && showFurigana) {
            return (
              <ruby key={i} className={isTarget ? 'target-word' : undefined}>
                {seg.text}<rt>{seg.reading}</rt>
              </ruby>
            )
          }
          return (
            <span key={i} className={isTarget ? 'target-word' : undefined}>
              {seg.text}
            </span>
          )
        })}
      </div>

      <div className="toggles">
        <button className="toggle-btn" onClick={onToggleFurigana}>
          {showFurigana ? 'Hide' : 'Show'} Furigana
        </button>
        <button className="toggle-btn" onClick={onToggleTranslation}>
          {showTranslation ? 'Hide' : 'Show'} Translation
        </button>
        <button className="toggle-btn" onClick={onToggleVocab}>
          {showVocab ? 'Hide' : 'Show'} Vocab
        </button>
      </div>

      {showTranslation && (
        <div className="translation">{translation}</div>
      )}

      {showVocab && (
        <div className="vocab-panel">
          {targetWord && (
            <div className="target-callout">
              <span className="target-callout-word">{targetWord.word}</span>
              <span className="target-callout-reading">（{targetWord.reading}）</span>
              <span className="target-callout-meaning">{targetWord.meaning}</span>
            </div>
          )}
          {sentenceVocab.length > 1 && (
            <ul>
              {sentenceVocab.slice(1).map(v => (
                <li key={v.word}>
                  <span className="vocab-word">{v.word}</span>
                  <span className="vocab-reading">（{v.reading}）</span>
                  <span className="vocab-meaning">{v.meaning}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
