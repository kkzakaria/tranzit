import type { Context, Next } from 'hono'

/**
 * Middleware Hono qui injecte les métadonnées de contexte d'audit
 * (IP et User-Agent) dans le contexte de la requête.
 *
 * À enregistrer globalement sur l'app pour que les handlers de routes
 * puissent récupérer ces valeurs via `c.get('ip')` et `c.get('userAgent')`.
 */
export async function auditContext(c: Context, next: Next) {
  c.set('ip',        c.req.header('x-forwarded-for') ?? 'unknown')
  c.set('userAgent', c.req.header('user-agent') ?? '')
  await next()
}
