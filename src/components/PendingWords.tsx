import { useState, useRef } from 'react'
import { addPendingWord, removePendingWord } from '../utils/pendingWords'

interface Props {
  pending: string[]
  onUpdate: () => void
}

export function PendingWords({ pending, onUpdate }: Props) {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = async () => {
    const word = input.trim()
    if (!word) return
    await addPendingWord(word)
    setInput('')
    onUpdate()
    inputRef.current?.focus()
  }

  const handleRemove = async (word: string) => {
    await removePendingWord(word)
    onUpdate()
  }

  return (
    <div className="pending-section">
      <button
        className="pending-toggle"
        onClick={() => setExpanded(v => !v)}
      >
        Add words
        {pending.length > 0 && <span className="badge">{pending.length} pending</span>}
      </button>

      {expanded && (
        <div className="pending-panel">
          <div className="pending-input-row">
            <input
              ref={inputRef}
              className="pending-input"
              type="text"
              placeholder="日本語"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              autoFocus
            />
            <button className="pending-add-btn" onClick={handleAdd} disabled={!input.trim()}>
              Add
            </button>
          </div>

          {pending.length > 0 && (
            <>
              <p className="pending-hint">
                Run <code>/import-vocab</code> to process these words.
              </p>
              <ul className="pending-list">
                {pending.map(word => (
                  <li key={word} className="pending-item">
                    <span>{word}</span>
                    <button
                      className="pending-remove-btn"
                      onClick={() => handleRemove(word)}
                      aria-label={`Remove ${word}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
