import type { Context, Next } from 'hono'
import { auth } from '../auth'

export type AuthUser = {
  id:        string
  email:     string
  name:      string
  role:      string
  serviceId: string | null
  ip:        string
  userAgent: string
}

/**
 * Middleware Hono qui vérifie la session Better Auth et la permission RBAC.
 *
 * - 401 si pas de session active
 * - 403 si la permission `resource:action` n'est pas accordée au rôle de l'utilisateur
 * - Injecte `AuthUser` dans le contexte via `c.set('user', ...)`
 *
 * Utilise `auth.api.userHasPermission` du plugin admin Better Auth.
 * L'endpoint POST `/admin/has-permission` accepte `{ userId, permissions: { resource: [action] } }`.
 */
export function requirePermission(resource: string, action: string) {
  return async (c: Context, next: Next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
      return c.json({ error: 'Non authentifié' }, 401)
    }

    const user = session.user as Record<string, unknown>
    const role = (user.role as string) ?? 'agent'

    // `userHasPermission` du plugin admin — on passe le userId pour récupérer
    // le rôle depuis la base de données, ou le role directement via `role`.
    const can = await auth.api.userHasPermission({
      body: {
        userId:      session.user.id,
        permissions: { [resource]: [action] },
      },
    })

    if (!can.success) {
      return c.json({ error: 'Non autorisé' }, 403)
    }

    c.set('user', {
      id:        session.user.id,
      email:     session.user.email,
      name:      session.user.name,
      role,
      serviceId: (user.serviceId as string | null) ?? null,
      ip:        c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
      userAgent: c.req.header('user-agent') ?? '',
    } satisfies AuthUser)

    await next()
  }
}
