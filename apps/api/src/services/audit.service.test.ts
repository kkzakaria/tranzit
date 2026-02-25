import { describe, test, expect } from 'bun:test'

describe('logAction', () => {
  test('insère une entrée dans audit_log via la transaction', async () => {
    const insertedValues: unknown[] = []
    const mockTx = {
      insert: (_table: unknown) => ({
        values: (v: unknown) => { insertedValues.push(v); return Promise.resolve() }
      })
    }

    const { logAction } = await import('./audit.service')
    const user = { id: 'user-1', ip: '1.2.3.4', userAgent: 'curl' }

    await logAction(
      mockTx as never,
      { entityType: 'CLIENT', action: 'CLIENT_CREATED' },
      'client-1',
      user,
      { after: { nom: 'ACME' } }
    )

    expect(insertedValues).toHaveLength(1)
    const entry = insertedValues[0] as Record<string, unknown>
    expect(entry.action).toBe('CLIENT_CREATED')
    expect(entry.entityType).toBe('CLIENT')
    expect(entry.entityId).toBe('client-1')
    expect(entry.userId).toBe('user-1')
  })

  test('accepte entityId null et user null', async () => {
    const insertedValues: unknown[] = []
    const mockTx = {
      insert: (_table: unknown) => ({
        values: (v: unknown) => { insertedValues.push(v); return Promise.resolve() }
      })
    }

    const { logAction } = await import('./audit.service')

    await logAction(
      mockTx as never,
      { entityType: 'USER', action: 'USER_LOGIN_FAILED' },
      null,
      null,
      { meta: { emailTente: 'x@y.com' } }
    )

    const entry = insertedValues[0] as Record<string, unknown>
    expect(entry.entityId).toBeUndefined()
    expect(entry.userId).toBeUndefined()
  })
})
