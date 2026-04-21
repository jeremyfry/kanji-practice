# Kanji Practice

A self-hosted Japanese vocabulary SRS (spaced repetition) app. Each review session shows a Claude-generated sentence featuring the target word, with furigana and translation toggles.

## How it works

- Vocabulary is stored in SQLite with an [FSRS](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) card per word
- When a word comes up for review, Claude Haiku generates a natural practice sentence using only vocabulary the student already knows
- Sentences use `{kanji|reading}` annotation for furigana rendering
- Rating (Again / Hard / Good / Easy) updates the FSRS card; the algorithm schedules the next review

## Setup

```bash
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY
npm run seed           # load public/vocab.tsv into the database
```

Run in development (two terminals):

```bash
npm run dev:server     # Hono API on :3000
npm run dev            # Vite frontend on :5173
```

## Deploying to a Linux VM

```bash
# On the server
git clone <repo> /opt/kanji-practice
cd /opt/kanji-practice
npm install
npm run build
cp .env.example .env   # fill in ANTHROPIC_API_KEY
npm run seed

# Start with PM2 and configure autostart
npm install -g pm2
pm2 start node_modules/.bin/tsx --name kanji-practice -- server/index.ts
pm2 save
pm2 startup   # prints a command to run — follow its instructions
```

The server listens on `PORT` (default 3000) and serves the built frontend as a SPA.

## Adding vocabulary

### From Skritter

Export your list from Skritter as a TSV file (Vocab → Export). Place the file anywhere in the project directory, then run the `/import-vocab` skill in Claude Code with the path as an argument:

```
/import-vocab skritter-export.tsv
```

The skill deduplicates against existing vocab, then POSTs new words to the server. SRS cards are created automatically.

### From the in-app panel

Type a word into the "Add words" panel and press Enter. Words queue in the database as pending. Run `/import-vocab` with no argument to process them — Claude will look up the reading and meaning for each word.

### Targeting the deployed server

The `/import-vocab` skill reads `KANJI_SERVER_URL` from your **local** `.env` (on the machine where you're running Claude Code). Set it to your VM's Tailscale hostname to import directly into the deployed instance:

```
KANJI_SERVER_URL=http://my-vm:3000
```

The VM's own `.env` does not need `KANJI_SERVER_URL`.

### Direct seed file

Add rows to `public/vocab.tsv` (tab-separated: word, reading, meaning) and re-run `npm run seed`.

## Environment variables

**Server** (VM's `.env`):

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required. Claude API key for sentence generation |
| `PORT` | `3000` | Server port |
| `DB_PATH` | `./kanji.db` | SQLite database path |

**Local** (desktop `.env`, used by `/import-vocab`):

| Variable | Default | Description |
|---|---|---|
| `KANJI_SERVER_URL` | `http://localhost:3000` | Server to import vocab into |

## Tech stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Hono + better-sqlite3 + TypeScript (via tsx)
- **SRS algorithm:** [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- **Sentence generation:** Claude Haiku with prompt caching on the vocabulary list
