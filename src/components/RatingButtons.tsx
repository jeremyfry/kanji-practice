import { Rating } from 'ts-fsrs'
import type { Grade } from 'ts-fsrs'

interface Props {
  onRate: (rating: Grade) => void
  disabled?: boolean
}

const RATINGS = [
  { rating: Rating.Again, label: 'Again', className: 'rating-again' },
  { rating: Rating.Hard,  label: 'Hard',  className: 'rating-hard'  },
  { rating: Rating.Good,  label: 'Good',  className: 'rating-good'  },
  { rating: Rating.Easy,  label: 'Easy',  className: 'rating-easy'  },
]

export function RatingButtons({ onRate, disabled }: Props) {
  return (
    <div className="rating-buttons">
      {RATINGS.map(({ rating, label, className }) => (
        <button
          key={rating}
          className={`rating-btn ${className}`}
          onClick={() => onRate(rating as Grade)}
          disabled={disabled}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
