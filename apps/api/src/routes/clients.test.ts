import { describe, test, expect } from 'bun:test'

describe('GET /api/v1/clients', () => {
  test('retourne 401 sans authentification', async () => {
    const { default: app } = await import('../index')
    const res = await app.request('/api/v1/clients')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/v1/clients', () => {
  test('retourne 401 sans authentification', async () => {
    const { default: app } = await import('../index')
    const res = await app.request('/api/v1/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: 'ACME', type: 'IMPORTATEUR' }),
    })
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/v1/clients/:id', () => {
  test('retourne 401 sans authentification', async () => {
    const { default: app } = await import('../index')
    const res = await app.request('/api/v1/clients/some-id', { method: 'DELETE' })
    expect(res.status).toBe(401)
  })
})
