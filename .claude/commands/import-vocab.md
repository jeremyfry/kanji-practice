Import new vocabulary into the kanji practice server. Handles two sources: (1) a Skritter TSV export file, and (2) words queued via the in-app "Add words" panel (fetched from the server). Deduplicates against the existing vocab list, looks up readings and definitions for pending words, then POSTs new words to the server. Sentences are generated automatically by the server when words come up for review — no sentence generation step needed here.

## Arguments

`$ARGUMENTS` is an optional path to a Skritter TSV export file. If not provided, only pending words from the server are processed.

## Steps

### 1. Get server URL

Read the `.env` file in the project root. Find the line starting with `KANJI_SERVER_URL=` and extract the value. If the line is not present, default to `http://localhost:3000`.

### 2. Load existing vocab

Run: `curl -sf {SERVER_URL}/api/vocab`

Parse the returned JSON array of `{ word, reading, meaning }` objects. Build a set of existing words for deduplication.

### 3. Collect new words from all sources

**From server pending words:**
Run: `curl -sf {SERVER_URL}/api/pending`

Returns a JSON array of word strings. Filter out any that already exist in the vocab set.

**From TSV export** (only if `$ARGUMENTS` was provided):
- Read the file at `$ARGUMENTS`. Format: `word\treading\tmeaning` (tab-separated, no header).
- Skip any line that doesn't have at least 3 tab-separated fields.
- Skip lines where the first field contains no Japanese characters.
- Filter out any words that already exist in the vocab set.

Report how many new words were found from each source and how many were duplicates.

If there are no new words from either source, stop here.

### 4. Resolve readings and meanings for pending words

Pending words are bare kanji/kana strings with no reading or meaning. For each one, provide:
- `reading`: the standard hiragana reading (most common dictionary form)
- `meaning`: a concise English definition (1–5 words, matching the style of existing entries)

For TSV export words, the reading and meaning are already present in the file.

### 5. POST new words to server

Run:
```
curl -sf -X POST {SERVER_URL}/api/vocab \
  -H 'Content-Type: application/json' \
  -d '{"words": [...]}'
```

Where `[...]` is the array of all new words: `{ "word": "...", "reading": "...", "meaning": "..." }`.

The server will insert the words and create SRS cards for them automatically.

### 6. Clear processed pending words

Run: `curl -sf -X DELETE {SERVER_URL}/api/pending -H 'Content-Type: application/json' -d '{}'`

This clears all pending words from the server queue.

### 7. Report

Summarize:
- N new words added (X from pending, Y from export file)
- Note: the server will generate practice sentences for new words automatically when they come up for review.
