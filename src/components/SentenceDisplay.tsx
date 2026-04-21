import { parseAnnotated } from '../utils/parseSentences'

interface Props {
  annotated:     string
  translation:   string
  targetWord:    string   // dictionary form, e.g. "付ける"
  targetReading: string
  targetMeaning: string
  targetSurface: string   // surface form in sentence, e.g. "付けた"
  showFurigana:    boolean
  showTranslation: boolean
  onToggleFurigana:    () => void
  onToggleTranslation: () => void
}

export function SentenceDisplay({
  annotated,
  translation,
  targetWord,
  targetReading,
  targetMeaning,
  targetSurface,
  showFurigana,
  showTranslation,
  onToggleFurigana,
  onToggleTranslation,
}: Props) {
  const segments = parseAnnotated(annotated)

  return (
    <div className="sentence-card">
      <div className="sentence-text">
        {segments.map((seg, i) => {
          const isTarget = seg.text === targetSurface
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
      </div>

      {showTranslation && (
        <div className="translation">{translation}</div>
      )}

      <div className="target-callout">
        <span className="target-callout-word">{targetWord}</span>
        <span className="target-callout-reading">（{targetReading}）</span>
        <span className="target-callout-meaning">{targetMeaning}</span>
      </div>
    </div>
  )
}
