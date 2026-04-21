export async function getPendingWords(): Promise<string[]> {
  const res = await fetch('/api/pending')
  return res.json()
}

export async function addPendingWord(word: string): Promise<void> {
  await fetch('/api/pending', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word }),
  })
}

export async function removePendingWord(word: string): Promise<void> {
  await fetch('/api/pending', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ word }),
  })
}
