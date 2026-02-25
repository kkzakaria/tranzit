import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../db'
import { dossiers, auditLog } from '../db/schema'
import { requirePermission } from '../middleware/auth'
import { logAction } from '../services/audit.service'
import { canTransition, buildDossierFilter } from '../services/dossiers.service'
import type { AuthUser } from '../middleware/auth'
import type { DossierStatut } from '@tranzit/types'

const router = new Hono<{ Variables: { user: AuthUser } }>()

async function generateReference(type: string): Promise<string> {
  const prefix = type.slice(0, 3).toUpperCase()
  const year   = new Date().getFullYear()
  const count  = await db.$count(dossiers)
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`
}

// GET /api/v1/dossiers
router.get('/', requirePermission('dossier', 'read'), async (c) => {
  const user   = c.get('user')
  const filter = buildDossierFilter(user)
  const rows   = filter
    ? await db.select().from(dossiers).where(filter).orderBy(dossiers.createdAt)
    : await db.select().from(dossiers).orderBy(dossiers.createdAt)
  return c.json({ data: rows })
})

// GET /api/v1/dossiers/:id
router.get('/:id', requirePermission('dossier', 'read'), async (c) => {
  const [dossier] = await db.select().from(dossiers).where(eq(dossiers.id, c.req.param('id')))
  if (!dossier) return c.json({ error: 'Dossier introuvable' }, 404)
  return c.json({ data: dossier })
})

// POST /api/v1/dossiers
router.post('/', requirePermission('dossier', 'create'), async (c) => {
  const body      = await c.req.json()
  const user      = c.get('user')
  const reference = await generateReference(body.type)

  const [created] = await db.transaction(async (tx) => {
    const rows = await tx.insert(dossiers).values({
      reference,
      type:      body.type,
      regimeId:  body.regimeId,
      clientId:  body.clientId,
      agentId:   user.id,
      serviceId: body.serviceId,
    }).returning()

    await logAction(tx as never, 'DOSSIER_CREATED', 'DOSSIER', rows[0].id, user, { after: rows[0] })
    return rows
  })

  return c.json({ data: created }, 201)
})

// PATCH /api/v1/dossiers/:id/statut
router.patch('/:id/statut', requirePermission('dossier', 'update'), async (c) => {
  const id                          = c.req.param('id')
  const { statut: newStatut }       = await c.req.json() as { statut: DossierStatut }
  const user                        = c.get('user')

  const [dossier] = await db.select().from(dossiers).where(eq(dossiers.id, id))
  if (!dossier) return c.json({ error: 'Dossier introuvable' }, 404)

  if (!canTransition(dossier.statut, newStatut)) {
    return c.json({ error: `Transition ${dossier.statut} → ${newStatut} invalide` }, 422)
  }

  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx.update(dossiers)
      .set({ statut: newStatut, updatedAt: new Date() })
      .where(eq(dossiers.id, id))
      .returning()

    await logAction(tx as never, 'DOSSIER_STATUS_CHANGED', 'DOSSIER', id, user, {
      before: { statut: dossier.statut },
      after:  { statut: newStatut },
    })
    return rows
  })

  return c.json({ data: updated })
})

// PATCH /api/v1/dossiers/:id/assign
router.patch('/:id/assign', requirePermission('dossier', 'reassign'), async (c) => {
  const id          = c.req.param('id')
  const { agentId } = await c.req.json()
  const user        = c.get('user')

  const [dossier] = await db.select().from(dossiers).where(eq(dossiers.id, id))
  if (!dossier) return c.json({ error: 'Dossier introuvable' }, 404)

  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx.update(dossiers)
      .set({ agentId, updatedAt: new Date() })
      .where(eq(dossiers.id, id))
      .returning()

    await logAction(tx as never, 'DOSSIER_ASSIGNED', 'DOSSIER', id, user, {
      before: { agentId: dossier.agentId },
      after:  { agentId },
    })
    return rows
  })

  return c.json({ data: updated })
})

// GET /api/v1/dossiers/:id/audit
router.get('/:id/audit', requirePermission('dossier', 'read'), async (c) => {
  const entries = await db.select().from(auditLog)
    .where(and(eq(auditLog.entityType, 'DOSSIER'), eq(auditLog.entityId, c.req.param('id'))))
    .orderBy(desc(auditLog.createdAt))
  return c.json({ data: entries, meta: { total: entries.length } })
})

export default router
