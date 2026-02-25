import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { clients } from '../db/schema'
import { requirePermission } from '../middleware/auth'
import { logAction } from '../services/audit.service'
import type { AuthUser } from '../middleware/auth'

type Variables = { user: AuthUser }

const router = new Hono<{ Variables: Variables }>()

// GET /api/v1/clients
router.get('/', requirePermission('client', 'read'), async (c) => {
  const rows = await db.select().from(clients).orderBy(clients.nom)
  return c.json({ data: rows })
})

// GET /api/v1/clients/:id
router.get('/:id', requirePermission('client', 'read'), async (c) => {
  const [client] = await db.select().from(clients).where(eq(clients.id, c.req.param('id')))
  if (!client) return c.json({ error: 'Client introuvable' }, 404)
  return c.json({ data: client })
})

// POST /api/v1/clients
router.post('/', requirePermission('client', 'create'), async (c) => {
  const body = await c.req.json()
  const user = c.get('user')

  const [created] = await db.transaction(async (tx) => {
    const rows = await tx.insert(clients).values({
      nom:     body.nom,
      type:    body.type,
      rc:      body.rc ?? null,
      nif:     body.nif ?? null,
      contact: body.contact ?? null,
    }).returning()

    await logAction(tx as never, 'CLIENT_CREATED', 'CLIENT', rows[0].id, user, { after: rows[0] })
    return rows
  })

  return c.json({ data: created }, 201)
})

// PATCH /api/v1/clients/:id
router.patch('/:id', requirePermission('client', 'update'), async (c) => {
  const id   = c.req.param('id')
  const body = await c.req.json()
  const user = c.get('user')

  const [before] = await db.select().from(clients).where(eq(clients.id, id))
  if (!before) return c.json({ error: 'Client introuvable' }, 404)

  const [after] = await db.transaction(async (tx) => {
    const rows = await tx.update(clients)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning()

    await logAction(tx as never, 'CLIENT_UPDATED', 'CLIENT', id, user, { before, after: rows[0] })
    return rows
  })

  return c.json({ data: after })
})

// DELETE /api/v1/clients/:id
router.delete('/:id', requirePermission('client', 'delete'), async (c) => {
  const id   = c.req.param('id')
  const user = c.get('user')

  const [client] = await db.select().from(clients).where(eq(clients.id, id))
  if (!client) return c.json({ error: 'Client introuvable' }, 404)

  await db.transaction(async (tx) => {
    await tx.delete(clients).where(eq(clients.id, id))
    await logAction(tx as never, 'CLIENT_DELETED', 'CLIENT', id, user, { before: client })
  })

  return new Response(null, { status: 204 })
})

export default router
