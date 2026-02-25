import { Hono } from 'hono'
import { db } from '../db'
import { auditLog } from '../db/schema'

const router = new Hono()

// GET /api/v1/auth/sessions — liste les sessions actives de l'utilisateur courant
router.get('/', async (c) => {
  const { auth } = await import('../auth')
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Non authentifié' }, 401)

  const sessions = await auth.api.listSessions({ headers: c.req.raw.headers })
  return c.json({ data: sessions })
})

// DELETE /api/v1/auth/sessions/:id — révoque une session spécifique (par token)
router.delete('/:id', async (c) => {
  const { auth } = await import('../auth')
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Non authentifié' }, 401)

  const token = c.req.param('id')

  await auth.api.revokeSession({
    headers: c.req.raw.headers,
    body:    { token },
  })

  await db.insert(auditLog).values({
    action:     'SESSION_REVOKED',
    entityType: 'SESSION',
    entityId:   undefined,
    userId:     session.user.id,
    ip:         c.req.header('x-forwarded-for') ?? 'unknown',
    userAgent:  c.req.header('user-agent') ?? '',
    payload:    { meta: { revokedSessionToken: token } },
  })

  return new Response(null, { status: 204 })
})

// DELETE /api/v1/auth/sessions — révoque toutes les sessions de l'utilisateur
router.delete('/', async (c) => {
  const { auth } = await import('../auth')
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Non authentifié' }, 401)

  await auth.api.revokeSessions({ headers: c.req.raw.headers })

  await db.insert(auditLog).values({
    action:     'SESSION_REVOKED',
    entityType: 'SESSION',
    entityId:   undefined,
    userId:     session.user.id,
    ip:         c.req.header('x-forwarded-for') ?? 'unknown',
    userAgent:  c.req.header('user-agent') ?? '',
    payload:    { meta: { scope: 'all' } },
  })

  return new Response(null, { status: 204 })
})

export default router
