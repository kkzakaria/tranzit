/**
 * Script utilitaire : crée les tables Better Auth en base via SQL direct.
 * Usage : DATABASE_URL=... bun run src/auth/migrate.ts
 *
 * Tables créées : user, session, account, verification
 * (conformes au schéma Better Auth v1.x + plugin admin)
 */
import postgres from 'postgres'

function buildClient() {
  const url = process.env.DATABASE_URL!
  const parsed = new URL(url)
  const socketPath = parsed.searchParams.get('host')

  if (socketPath && socketPath.startsWith('/')) {
    const dbName = parsed.pathname.replace(/^\//, '') || parsed.hostname
    return postgres({
      host: socketPath,
      database: dbName,
      username: parsed.username || undefined,
    })
  }

  return postgres(url)
}

const sql = buildClient()

await sql`
  CREATE TABLE IF NOT EXISTS "user" (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    email            TEXT NOT NULL UNIQUE,
    "emailVerified"  BOOLEAN NOT NULL DEFAULT false,
    image            TEXT,
    "createdAt"      TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt"      TIMESTAMP NOT NULL DEFAULT now(),
    role             TEXT,
    banned           BOOLEAN DEFAULT false,
    "banReason"      TEXT,
    "banExpires"     TIMESTAMP
  )
`

await sql`
  CREATE TABLE IF NOT EXISTS session (
    id               TEXT PRIMARY KEY,
    "expiresAt"      TIMESTAMP NOT NULL,
    token            TEXT NOT NULL UNIQUE,
    "createdAt"      TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt"      TIMESTAMP NOT NULL DEFAULT now(),
    "ipAddress"      TEXT,
    "userAgent"      TEXT,
    "userId"         TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "impersonatedBy" TEXT
  )
`

await sql`
  CREATE INDEX IF NOT EXISTS session_user_id_idx ON session ("userId")
`

await sql`
  CREATE TABLE IF NOT EXISTS account (
    id                       TEXT PRIMARY KEY,
    "accountId"              TEXT NOT NULL,
    "providerId"             TEXT NOT NULL,
    "userId"                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    "accessToken"            TEXT,
    "refreshToken"           TEXT,
    "idToken"                TEXT,
    "accessTokenExpiresAt"   TIMESTAMP,
    "refreshTokenExpiresAt"  TIMESTAMP,
    scope                    TEXT,
    password                 TEXT,
    "createdAt"              TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt"              TIMESTAMP NOT NULL DEFAULT now()
  )
`

await sql`
  CREATE INDEX IF NOT EXISTS account_user_id_idx ON account ("userId")
`

await sql`
  CREATE TABLE IF NOT EXISTS verification (
    id            TEXT PRIMARY KEY,
    identifier    TEXT NOT NULL,
    value         TEXT NOT NULL,
    "expiresAt"   TIMESTAMP NOT NULL,
    "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt"   TIMESTAMP NOT NULL DEFAULT now()
  )
`

await sql`
  CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier)
`

console.log('Better Auth: tables créées avec succès.')
await sql.end()
process.exit(0)
