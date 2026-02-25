import type { Context, Next } from 'hono'
import type { UserRole } from '@tranzit/types'

// AuthUser discriminé par rôle : enforces serviceId non-null pour responsable/agent
export type AuthUser =
  | { role: 'admin' | 'superviseur'; serviceId: null;   id: string; email: string; name: string; ip: string; userAgent: string }
  | { role: 'responsable' | 'agent'; serviceId: string; id: string; email: string; name: string; ip: string; userAgent: string }

/**
 * Middleware Hono qui vérifie la session Better Auth et la permission RBAC.
 *
 * - 401 si pas de session active
 * - 403 si la permission `resource:action` n'est pas accordée
 * - 503 si Better Auth est indisponible
 * - Injecte `AuthUser` dans le contexte via `c.set('user', ...)`
 *
 * L'import de `auth` est lazy (dynamic import) pour casser le cycle circulaire :
 * index → routes/* → middleware/auth → auth/index → db
 */
export function requirePermission(resource: string, action: string) {
  return async (c: Context, next: Next) => {
    const { auth } = await import('../auth')

    let session: Awaited<ReturnType<typeof auth.api.getSession>>
    try {
      session = await auth.api.getSession({ headers: c.req.raw.headers })
    } catch (err) {
      console.error('[auth] getSession a échoué', err)
      return c.json({ error: 'Service d\'authentification indisponible' }, 503)
    }

    if (!session?.user) {
      return c.json({ error: 'Non authentifié' }, 401)
    }

    let can: { success: boolean }
    try {
      can = await auth.api.userHasPermission({
        body: {
          userId:      session.user.id,
          permissions: { [resource]: [action] },
        },
      })
    } catch (err) {
      console.error('[auth] userHasPermission a échoué', err)
      return c.json({ error: 'Vérification des permissions échouée' }, 503)
    }

    if (!can.success) {
      return c.json({ error: 'Non autorisé' }, 403)
    }

    const raw       = session.user as Record<string, unknown>
    const role      = ((raw.role as string) ?? 'agent') as UserRole
    const serviceId = (raw.serviceId as string | null) ?? null

    // Construction typée : AuthUser est un discriminated union sur role
    const user: AuthUser = (role === 'admin' || role === 'superviseur')
      ? { role, serviceId: null,       id: session.user.id, email: session.user.email, name: session.user.name, ip: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown', userAgent: c.req.header('user-agent') ?? '' }
      : { role, serviceId: serviceId!, id: session.user.id, email: session.user.email, name: session.user.name, ip: c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown', userAgent: c.req.header('user-agent') ?? '' }

    c.set('user', user)
    await next()
  }
}
