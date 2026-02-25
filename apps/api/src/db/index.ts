import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Variable d'environnement requise manquante : ${name}`)
  return val
}

function buildClient() {
  const url = requireEnv('DATABASE_URL')
  const parsed = new URL(url)
  const socketPath = parsed.searchParams.get('host')

  if (socketPath && socketPath.startsWith('/')) {
    // Unix socket : peer auth PostgreSQL (WSL2 / Linux)
    const dbName = parsed.pathname.replace(/^\//, '') || parsed.hostname
    return postgres({
      host:     socketPath,
      database: dbName,
      username: parsed.username || undefined,
    })
  }

  return postgres(url)
}

const client = buildClient()
export const db = drizzle(client, { schema })
export type DB = typeof db
