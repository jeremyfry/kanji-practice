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
# On the VM
git clone <repo> /opt/kanji-practice
cd /opt/kanji-practice
npm install
npm run build
cp .env.example .env   # fill in ANTHROPIC_API_KEY
npm run seed

# Systemd service
sed -i 's/YOUR_USER/your-username/' kanji-practice.service
sudo cp kanji-practice.service /etc/systemd/system/
sudo systemctl enable --now kanji-practice
```

The server listens on `PORT` (default 3000) and serves the built frontend as a SPA.

## Adding vocabulary

**From a Skritter TSV export** or to process words queued via the in-app pending words panel, use the `/import-vocab` Claude Code skill. It looks up readings/meanings and POSTs them to the server.

Set `KANJI_SERVER_URL` in `.env` to your VM's Tailscale hostname when running the skill remotely:

```
KANJI_SERVER_URL=http://my-vm:3000
```

**Direct seed file:** add rows to `public/vocab.tsv` (tab-separated: word, reading, meaning) and re-run `npm run seed`.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required. Claude API key |
| `PORT` | `3000` | Server port |
| `DB_PATH` | `./kanji.db` | SQLite database path |
| `KANJI_SERVER_URL` | `http://localhost:3000` | Used by `/import-vocab` skill |

## Tech stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Hono + better-sqlite3 + TypeScript (via tsx)
- **SRS algorithm:** [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)
- **Sentence generation:** Claude Haiku with prompt caching on the vocabulary list
