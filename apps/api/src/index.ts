import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { auth } from './auth'
import clientsRouter from './routes/clients'
import dossiersRouter from './routes/dossiers'
import documentsRouter from './routes/documents'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin:      process.env.WEB_URL ?? 'http://localhost:34000',
  credentials: true,
}))

app.get('/api/v1/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

// Monter toutes les routes Better Auth
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))

app.route('/api/v1/clients', clientsRouter)
app.route('/api/v1/dossiers', dossiersRouter)

// Upload sur les dossiers
app.route('/api/v1/dossiers', documentsRouter)
// Accès direct aux documents
app.route('/api/v1/documents', documentsRouter)

export default app

const port = Number(process.env.PORT ?? 3001)
console.log(`API running on http://localhost:${port}`)

Bun.serve({ fetch: app.fetch, port })
