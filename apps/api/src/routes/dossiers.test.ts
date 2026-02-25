import { describe, test, expect } from 'bun:test'

describe('GET /api/v1/dossiers', () => {
  test('retourne 401 sans authentification', async () => {
    const { default: app } = await import('../index')
    const res = await app.request('/api/v1/dossiers')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/v1/dossiers', () => {
  test('retourne 401 sans authentification', async () => {
    const { default: app } = await import('../index')
    const res = await app.request('/api/v1/dossiers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'IMPORT', regimeId: 'r1', clientId: 'c1', serviceId: 's1' }),
    })
    expect(res.status).toBe(401)
  })
})
