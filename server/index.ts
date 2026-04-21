import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync } from 'node:fs'
import { routes } from './routes.ts'

const app = new Hono()

// ── API ───────────────────────────────────────────────────────────────────────
app.route('/api', routes)

// ── Static frontend ───────────────────────────────────────────────────────────
// Serve Vite build output; fall back to index.html for SPA routing.
app.use('/assets/*', serveStatic({ root: './dist' }))

app.get('*', (c) => {
  try {
    const html = readFileSync('./dist/index.html', 'utf8')
    return c.html(html)
  } catch {
    return c.text('Frontend not built. Run: npm run build', 503)
  }
})

// ── Start ─────────────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT ?? '3000', 10)
console.log(`Kanji practice server listening on http://localhost:${port}`)

serve({ fetch: app.fetch, port })
