import { Hono } from 'hono'
import { eq, and, desc, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db'
import { dossiers, auditLog } from '../db/schema'
import { requirePermission } from '../middleware/auth'
import { logAction } from '../services/audit.service'
import { canTransition, buildDossierFilter } from '../services/dossiers.service'
import type { AuthUser } from '../middleware/auth'
import type { DossierType, DossierStatut } from '@tranzit/types'

const router = new Hono<{ Variables: { user: AuthUser } }>()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTx = any

// Génère la référence DANS la transaction — compte les dossiers du même type+année
// pour éviter les numéros de séquence globaux. Retry géré par le handler sur erreur 23505.
async function generateReference(tx: AnyTx, type: DossierType): Promise<string> {
  const prefix = type === 'ADMISSION_TEMPORAIRE' ? 'ADT' : type.slice(0, 3).toUpperCase()
  const year   = new Date().getFullYear()
  const pattern = `${prefix}-${year}-%`
  const [{ count }] = await tx
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(dossiers)
    .where(sql`reference LIKE ${pattern}`)
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`
}

const CreateDossierSchema = z.object({
  type:      z.enum(['IMPORT', 'EXPORT', 'TRANSIT', 'ADMISSION_TEMPORAIRE']),
  regimeId:  z.string().uuid('regimeId doit être un UUID'),
  clientId:  z.string().uuid('clientId doit être un UUID'),
  serviceId: z.string().uuid('serviceId doit être un UUID'),
})

const StatutSchema = z.object({
  statut: z.enum(['BROUILLON', 'DEPOSE', 'EN_COURS', 'EN_ATTENTE', 'DEDOUANE', 'CLOTURE', 'REJETE']),
})

const AssignSchema = z.object({
  agentId: z.string().uuid('agentId doit être un UUID'),
})

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
  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Corps JSON invalide' }, 400) }

  const parsed = CreateDossierSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400)

  const user = c.get('user')
  const data = parsed.data

  // Retry sur violation de contrainte UNIQUE de la référence (code Postgres 23505)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [created] = await db.transaction(async (tx) => {
        const reference = await generateReference(tx, data.type)
        const rows = await tx.insert(dossiers).values({
          reference,
          type:      data.type,
          regimeId:  data.regimeId,
          clientId:  data.clientId,
          agentId:   user.id,
          serviceId: data.serviceId,
        }).returning()

        await logAction(tx as never, { entityType: 'DOSSIER', action: 'DOSSIER_CREATED' }, rows[0].id, user, { after: rows[0] })
        return rows
      })

      return c.json({ data: created }, 201)
    } catch (err: unknown) {
      const pgErr = err as { code?: string }
      if (pgErr.code === '23505' && attempt < 4) continue
      throw err
    }
  }

  // Ne devrait jamais être atteint
  return c.json({ error: 'Impossible de générer une référence unique' }, 500)
})

// PATCH /api/v1/dossiers/:id/statut
router.patch('/:id/statut', requirePermission('dossier', 'update'), async (c) => {
  const id = c.req.param('id')

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Corps JSON invalide' }, 400) }

  const parsed = StatutSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400)

  const newStatut = parsed.data.statut as DossierStatut
  const user      = c.get('user')

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

    await logAction(tx as never, { entityType: 'DOSSIER', action: 'DOSSIER_STATUS_CHANGED' }, id, user, {
      before: { statut: dossier.statut },
      after:  { statut: newStatut },
    })
    return rows
  })

  return c.json({ data: updated })
})

// PATCH /api/v1/dossiers/:id/assign
router.patch('/:id/assign', requirePermission('dossier', 'reassign'), async (c) => {
  const id = c.req.param('id')

  let body: unknown
  try { body = await c.req.json() } catch { return c.json({ error: 'Corps JSON invalide' }, 400) }

  const parsed = AssignSchema.safeParse(body)
  if (!parsed.success) return c.json({ error: 'Données invalides', details: parsed.error.flatten() }, 400)

  const agentId = parsed.data.agentId
  const user    = c.get('user')

  const [dossier] = await db.select().from(dossiers).where(eq(dossiers.id, id))
  if (!dossier) return c.json({ error: 'Dossier introuvable' }, 404)

  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx.update(dossiers)
      .set({ agentId, updatedAt: new Date() })
      .where(eq(dossiers.id, id))
      .returning()

    await logAction(tx as never, { entityType: 'DOSSIER', action: 'DOSSIER_ASSIGNED' }, id, user, {
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
