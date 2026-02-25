import { describe, test, expect } from 'bun:test'
import { Hono } from 'hono'

describe('requirePermission middleware', () => {
  test('retourne 401 sans session', async () => {
    // Import dynamique pour éviter les effets de bord Better Auth au chargement
    const { requirePermission } = await import('./auth')
    const app = new Hono()
    app.get('/test', requirePermission('dossier', 'read'), (c) => c.json({ ok: true }))

    const res = await app.request('/test')
    expect(res.status).toBe(401)
  })
})
