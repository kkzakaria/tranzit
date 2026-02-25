import { describe, test, expect } from 'bun:test'

describe('GET /api/v1/auth/sessions', () => {
  test('retourne 401 sans authentification', async () => {
    const { default: app } = await import('../index')
    const res = await app.request('/api/v1/auth/sessions')
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/v1/auth/sessions/:id', () => {
  test('retourne 401 sans authentification', async () => {
    const { default: app } = await import('../index')
    const res = await app.request('/api/v1/auth/sessions/some-id', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })
})
