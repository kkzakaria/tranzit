import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin:      process.env.WEB_URL ?? 'http://localhost:34000',
  credentials: true,
}))

app.get('/api/v1/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

export default app

const port = Number(process.env.PORT ?? 3001)
console.log(`API running on http://localhost:${port}`)

Bun.serve({ fetch: app.fetch, port })
