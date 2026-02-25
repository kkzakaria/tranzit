import { describe, test, expect } from 'bun:test'

describe('POST /api/v1/dossiers/:id/documents', () => {
  test('retourne 401 sans authentification', async () => {
    const { default: app } = await import('../index')
    const res = await app.request('/api/v1/dossiers/some-id/documents', { method: 'POST' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/v1/documents/:id/url', () => {
  test('retourne 401 sans authentification', async () => {
    const { default: app } = await import('../index')
    const res = await app.request('/api/v1/documents/some-id/url')
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/v1/documents/:id', () => {
  test('retourne 401 sans authentification', async () => {
    const { default: app } = await import('../index')
    const res = await app.request('/api/v1/documents/some-id', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })
})
