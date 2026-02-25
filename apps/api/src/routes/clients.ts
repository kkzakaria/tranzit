import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { clients } from '../db/schema'
import { requirePermission } from '../middleware/auth'
import { logAction } from '../services/audit.service'
import type { AuthUser } from '../middleware/auth'

const CreateClientSchema = z.object({
  nom:     z.string().min(1, 'Le nom est requis'),
  type:    z.enum(['IMPORTATEUR', 'EXPORTATEUR', 'LES_DEUX']),
  rc:      z.string().optional(),
  nif:     z.string().optional(),
  contact: z.string().optional(),
})

const UpdateClientSchema = CreateClientSchema.partial()

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
  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Corps JSON invalide' }, 400) }

  const parsed = CreateClientSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400)

  const user = c.get('user')
  const data = parsed.data

  const [created] = await db.transaction(async (tx) => {
    const rows = await tx.insert(clients).values({
      nom:     data.nom,
      type:    data.type,
      rc:      data.rc ?? null,
      nif:     data.nif ?? null,
      contact: data.contact ?? null,
    }).returning()

    await logAction(tx as never, { entityType: 'CLIENT', action: 'CLIENT_CREATED' }, rows[0].id, user, { after: rows[0] })
    return rows
  })

  return c.json({ data: created }, 201)
})

// PATCH /api/v1/clients/:id
router.patch('/:id', requirePermission('client', 'update'), async (c) => {
  const id = c.req.param('id')

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Corps JSON invalide' }, 400) }

  const parsed = UpdateClientSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400)

  const user = c.get('user')

  const [before] = await db.select().from(clients).where(eq(clients.id, id))
  if (!before) return c.json({ error: 'Client introuvable' }, 404)

  const data = parsed.data

  const [after] = await db.transaction(async (tx) => {
    const rows = await tx.update(clients)
      .set({
        // Whitelist explicite : seuls ces champs peuvent être modifiés
        ...(data.nom     !== undefined && { nom:     data.nom }),
        ...(data.type    !== undefined && { type:    data.type }),
        ...(data.rc      !== undefined && { rc:      data.rc }),
        ...(data.nif     !== undefined && { nif:     data.nif }),
        ...(data.contact !== undefined && { contact: data.contact }),
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))
      .returning()

    await logAction(tx as never, { entityType: 'CLIENT', action: 'CLIENT_UPDATED' }, id, user, { before, after: rows[0] })
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
    await logAction(tx as never, { entityType: 'CLIENT', action: 'CLIENT_DELETED' }, id, user, { before: client })
  })

  return new Response(null, { status: 204 })
})

export default router
