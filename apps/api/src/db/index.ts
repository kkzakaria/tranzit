import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

function buildClient() {
  const url = process.env.DATABASE_URL!
  const parsed = new URL(url)
  const socketPath = parsed.searchParams.get('host')

  if (socketPath && socketPath.startsWith('/')) {
    // Unix socket: pass host as option, not in URL
    const dbName = parsed.pathname.replace(/^\//, '') || parsed.hostname
    return postgres({
      host: socketPath,
      database: dbName,
      username: parsed.username || undefined,
    })
  }

  return postgres(url)
}

const client = buildClient()
export const db = drizzle(client, { schema })
export type DB = typeof db
