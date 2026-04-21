# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (run both in parallel)
npm run dev          # Vite frontend dev server on :5173 (proxies /api → :3000)
npm run dev:server   # Hono backend with live reload on :3000

# Production
npm run build        # tsc (server) + vite build (frontend) → dist/
npm start            # Serve production build on :3000

# Database
npm run seed         # Load public/vocab.tsv into kanji.db (idempotent)
```

No test suite — verify with browser at http://localhost:5173 and curl for API endpoints.

## Environment Variables

```
ANTHROPIC_API_KEY=          # Required: Claude API key
PORT=3000                   # Optional (default 3000)
DB_PATH=./kanji.db          # Optional (default ./kanji.db)
KANJI_SERVER_URL=http://localhost:3000  # Used by /import-vocab skill
```

## Architecture

**Full-stack TypeScript monorepo** — Hono server (`server/`) + Vite/React SPA (`src/`), sharing a single `package.json`. Two separate tsconfig files: `tsconfig.json` (frontend, ES2020) and `tsconfig.server.json` (backend, ES2022, Node types).

### Backend (`server/`)

- **`index.ts`** — Hono app setup; mounts routes, serves `dist/` as SPA fallback
- **`routes.ts`** — All `/api/*` endpoints
- **`db.ts`** — SQLite schema (WAL mode), converters between DB rows and ts-fsrs `Card` objects
- **`srs.ts`** — FSRS spaced repetition logic: `getNextWord()` picks due/random card; `applyRating()` advances card state
- **`sentence-gen.ts`** — Calls Claude Haiku with prompt caching on the system message (vocab list). Expects JSON back: `{ annotated, translation, targetSurface }`
- **`seed.ts`** — One-time loader for `public/vocab.tsv`

**Database tables:** `vocab` (word/reading/meaning), `srs_cards` (FSRS state per word), `pending_words` (user-queued words awaiting lookup).

### Frontend (`src/`)

- **`App.tsx`** — Central state machine: `loading → card → empty → error`. Owns `showFurigana`/`showTranslation` toggles. Fetches `/api/review/next`, submits ratings to `/api/review/:word`.
- **`SentenceDisplay.tsx`** — Parses `{kanji|reading}` annotation format into `<ruby>` tags, highlights target word.
- **`RatingButtons.tsx`** — Four buttons (Again=1 / Hard=2 / Good=3 / Easy=4), maps to ts-fsrs `Grade`.
- **`PendingWords.tsx`** — Input panel for queueing words; calls `/api/pending` CRUD.
- **`utils/parseSentences.ts`** — Regex parser for `{kanji|reading}` format.

### Key Patterns

**Sentence annotation format:** Claude returns sentences like `{今日|きょう}は{暑|あつ}い`. The frontend parses these into `<ruby>` elements for furigana display.

**Prompt caching:** `sentence-gen.ts` sends the full vocab list as the system message with `cache_control: { type: "ephemeral" }`. The in-memory vocab cache is invalidated when `POST /api/vocab` adds new words.

**FSRS integration:** `server/db.ts` handles conversion between the DB's flat row format and ts-fsrs's `Card` object. `srs.ts` uses the ts-fsrs `createEmptyCard()` and scheduling APIs directly.

**Pending word flow:** User types a word → stored in `pending_words` table → user runs `/import-vocab` skill → skill POSTs to `/api/vocab` with reading/meaning → SRS card created → pending entry cleared.

## Custom Skills

**`/import-vocab`** (defined in `.claude/commands/import-vocab.md`) — Imports vocabulary from either a Skritter TSV export or the server's pending words queue. Looks up readings/meanings and POSTs to `/api/vocab`. Uses `KANJI_SERVER_URL` env var.
