# Backend Tranzit — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mettre en place le backend API REST pour la gestion de dossiers douaniers (concessionnaire en douane) — Hono sur Bun avec PostgreSQL, Better Auth + RBAC, GED S3, et audit trail complet.

**Architecture:** Monorepo Bun workspaces — l'app Next.js reste à la racine, le backend vit dans `apps/api/`, les types partagés dans `packages/types/`. L'API REST est exposée sur le port 3001 avec le préfixe `/api/v1/`.

**Tech Stack:** Bun · Hono.js · Drizzle ORM · PostgreSQL · Better Auth + plugin RBAC · AWS SDK v3 (S3-compatible) · `bun:test`

---

## Prérequis

- PostgreSQL 15+ accessible en local (ex. `postgresql://localhost:5432/tranzit_dev`)
- Un bucket S3-compatible accessible (MinIO en local ou Cloudflare R2)
- Bun >= 1.1 installé

---

## Task 1 : Initialiser le monorepo Bun workspaces

**Files:**
- Modify: `package.json` (racine)
- Create: `apps/api/package.json`
- Create: `packages/types/package.json`
- Create: `packages/types/src/index.ts`

**Step 1 : Configurer les workspaces dans le package.json racine**

Remplacer le contenu de `package.json` par :

```json
{
  "name": "tranzit",
  "version": "0.1.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev":      "next dev --port 34000",
    "dev:api":  "bun run --cwd apps/api dev",
    "build":    "next build",
    "start":    "next start",
    "lint":     "eslint"
  },
  "dependencies": {
    "@base-ui/react": "^1.1.0",
    "@hugeicons/core-free-icons": "^3.1.1",
    "@hugeicons/react": "^1.1.5",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "next": "16.1.6",
    "next-intl": "^4.8.3",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "shadcn": "^3.8.4",
    "tailwind-merge": "^3.4.0",
    "tw-animate-css": "^1.4.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  },
  "ignoreScripts": ["sharp", "unrs-resolver"],
  "trustedDependencies": ["sharp", "unrs-resolver"]
}
```

**Step 2 : Créer le package des types partagés**

```bash
mkdir -p packages/types/src
```

Créer `packages/types/package.json` :

```json
{
  "name": "@tranzit/types",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

Créer `packages/types/src/index.ts` (vide pour l'instant) :

```ts
// Types partagés web <-> api
export * from './dossier'
export * from './client'
export * from './audit'
```

**Step 3 : Créer le dossier apps/api**

```bash
mkdir -p apps/api/src
```

Créer `apps/api/package.json` :

```json
{
  "name": "@tranzit/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev":   "bun run --watch src/index.ts",
    "start": "bun run src/index.ts",
    "test":  "bun test"
  },
  "dependencies": {
    "@tranzit/types": "workspace:*"
  }
}
```

**Step 4 : Vérifier la résolution des workspaces**

```bash
bun install
```

Résultat attendu : `bun install` sans erreur, `node_modules/@tranzit/types` symlink créé.

**Step 5 : Commit**

```bash
git add package.json apps/api/package.json packages/types/
git commit -m "chore: initialize Bun workspaces monorepo with api and types packages"
```

---

## Task 2 : Types partagés (`packages/types`)

**Files:**
- Create: `packages/types/src/dossier.ts`
- Create: `packages/types/src/client.ts`
- Create: `packages/types/src/audit.ts`
- Modify: `packages/types/src/index.ts`

**Step 1 : Définir les enums et types dossier**

Créer `packages/types/src/dossier.ts` :

```ts
export type DossierType = 'IMPORT' | 'EXPORT' | 'TRANSIT' | 'ADMISSION_TEMPORAIRE'

export type DossierStatut =
  | 'BROUILLON'
  | 'DEPOSE'
  | 'EN_COURS'
  | 'EN_ATTENTE'
  | 'DEDOUANE'
  | 'CLOTURE'
  | 'REJETE'

export type TypeDoc =
  | 'FACTURE'
  | 'CONNAISSEMENT'
  | 'CERTIFICAT_ORIGINE'
  | 'LISTE_COLISAGE'
  | 'DECLARATION'
  | 'LICENCE'
  | 'BON_COMMANDE'
  | 'AUTRE'

export interface Dossier {
  id:         string
  reference:  string
  type:       DossierType
  statut:     DossierStatut
  regimeId:   string
  clientId:   string
  agentId:    string
  serviceId:  string
  createdAt:  string
  updatedAt:  string
}

export interface Document {
  id:          string
  dossierId:   string
  nom:         string
  typeDoc:     TypeDoc
  storageKey:  string
  taille:      number
  uploadedBy:  string
  createdAt:   string
}
```

**Step 2 : Définir les types client**

Créer `packages/types/src/client.ts` :

```ts
export type ClientType = 'IMPORTATEUR' | 'EXPORTATEUR' | 'LES_DEUX'

export interface Client {
  id:        string
  nom:       string
  type:      ClientType
  rc:        string | null
  nif:       string | null
  contact:   string | null
  createdAt: string
  updatedAt: string
}
```

**Step 3 : Définir les types audit**

Créer `packages/types/src/audit.ts` :

```ts
export type AuditEntityType = 'DOSSIER' | 'DOCUMENT' | 'CLIENT' | 'USER' | 'SESSION'

export type AuditAction =
  | 'DOSSIER_CREATED' | 'DOSSIER_UPDATED' | 'DOSSIER_STATUS_CHANGED' | 'DOSSIER_ASSIGNED'
  | 'DOCUMENT_UPLOADED' | 'DOCUMENT_DELETED'
  | 'CLIENT_CREATED' | 'CLIENT_UPDATED' | 'CLIENT_DELETED'
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DEACTIVATED' | 'USER_REACTIVATED'
  | 'USER_ROLE_CHANGED' | 'USER_PASSWORD_CHANGED'
  | 'USER_LOGIN' | 'USER_LOGIN_FAILED' | 'USER_LOGOUT'
  | 'SESSION_REVOKED'

export interface AuditEntry {
  id:         string
  entityType: AuditEntityType
  entityId:   string | null
  action:     AuditAction
  userId:     string | null
  payload:    Record<string, unknown> | null
  ip:         string | null
  userAgent:  string | null
  createdAt:  string
}
```

**Step 4 : Commit**

```bash
git add packages/types/
git commit -m "feat(types): add shared domain types for dossier, client, and audit"
```

---

## Task 3 : Setup Hono + dépendances `apps/api`

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/index.ts`
- Create: `apps/api/tsconfig.json`

**Step 1 : Installer les dépendances**

```bash
bun add --cwd apps/api hono @hono/node-server
bun add --cwd apps/api drizzle-orm @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
bun add --cwd apps/api better-auth
bun add --cwd apps/api -d drizzle-kit @types/bun
```

**Step 2 : Créer le tsconfig**

Créer `apps/api/tsconfig.json` :

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*"]
}
```

**Step 3 : Créer l'entry point Hono**

Créer `apps/api/src/index.ts` :

```ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

app.use('*', logger())
app.use('*', cors({
  origin:      process.env.WEB_URL ?? 'http://localhost:34000',
  credentials: true,
}))

app.get('/api/v1/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

export default app

const port = Number(process.env.PORT ?? 3001)
console.log(`API running on http://localhost:${port}`)

Bun.serve({ fetch: app.fetch, port })
```

**Step 4 : Tester le démarrage**

```bash
bun run --cwd apps/api dev
```

Dans un autre terminal :

```bash
curl http://localhost:3001/api/v1/health
```

Résultat attendu : `{"status":"ok","ts":"2026-..."}`

**Step 5 : Commit**

```bash
git add apps/api/
git commit -m "feat(api): bootstrap Hono app with health endpoint"
```

---

## Task 4 : Schéma Drizzle + connexion PostgreSQL

**Files:**
- Create: `apps/api/src/db/index.ts`
- Create: `apps/api/src/db/schema.ts`
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/.env.example`

**Step 1 : Créer le fichier .env.example**

Créer `apps/api/.env.example` :

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tranzit_dev
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=tranzit
WEB_URL=http://localhost:34000
PORT=3001
BETTER_AUTH_SECRET=change-me-in-production-min-32-chars
```

Copier en `.env` local :

```bash
cp apps/api/.env.example apps/api/.env
```

**Step 2 : Connexion DB**

Créer `apps/api/src/db/index.ts` :

```ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })
export type DB = typeof db
```

**Step 3 : Écrire le schéma complet**

Créer `apps/api/src/db/schema.ts` :

```ts
import {
  pgTable, uuid, varchar, text, timestamp, boolean,
  pgEnum, integer, jsonb, index,
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const dossierTypeEnum   = pgEnum('dossier_type',   ['IMPORT','EXPORT','TRANSIT','ADMISSION_TEMPORAIRE'])
export const dossierStatutEnum = pgEnum('dossier_statut', ['BROUILLON','DEPOSE','EN_COURS','EN_ATTENTE','DEDOUANE','CLOTURE','REJETE'])
export const clientTypeEnum    = pgEnum('client_type',    ['IMPORTATEUR','EXPORTATEUR','LES_DEUX'])
export const typeDocEnum       = pgEnum('type_doc',       ['FACTURE','CONNAISSEMENT','CERTIFICAT_ORIGINE','LISTE_COLISAGE','DECLARATION','LICENCE','BON_COMMANDE','AUTRE'])
export const auditEntityEnum   = pgEnum('audit_entity',   ['DOSSIER','DOCUMENT','CLIENT','USER','SESSION'])
export const auditActionEnum   = pgEnum('audit_action',   [
  'DOSSIER_CREATED','DOSSIER_UPDATED','DOSSIER_STATUS_CHANGED','DOSSIER_ASSIGNED',
  'DOCUMENT_UPLOADED','DOCUMENT_DELETED',
  'CLIENT_CREATED','CLIENT_UPDATED','CLIENT_DELETED',
  'USER_CREATED','USER_UPDATED','USER_DEACTIVATED','USER_REACTIVATED',
  'USER_ROLE_CHANGED','USER_PASSWORD_CHANGED',
  'USER_LOGIN','USER_LOGIN_FAILED','USER_LOGOUT',
  'SESSION_REVOKED',
])

// ─── Organisation ─────────────────────────────────────────────────────────────

export const departements = pgTable('departements', {
  id:          uuid('id').primaryKey().defaultRandom(),
  nom:         varchar('nom', { length: 100 }).notNull(),
  description: text('description'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

export const services = pgTable('services', {
  id:             uuid('id').primaryKey().defaultRandom(),
  nom:            varchar('nom', { length: 100 }).notNull(),
  departementId:  uuid('departement_id').references(() => departements.id).notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
})

// ─── Référentiel ──────────────────────────────────────────────────────────────

export const regimesDouaniers = pgTable('regimes_douaniers', {
  id:          uuid('id').primaryKey().defaultRandom(),
  code:        varchar('code', { length: 10 }).notNull().unique(),
  libelle:     varchar('libelle', { length: 200 }).notNull(),
  description: text('description'),
  actif:       boolean('actif').notNull().default(true),
})

// ─── Clients ──────────────────────────────────────────────────────────────────

export const clients = pgTable('clients', {
  id:        uuid('id').primaryKey().defaultRandom(),
  nom:       varchar('nom', { length: 200 }).notNull(),
  type:      clientTypeEnum('type').notNull(),
  rc:        varchar('rc', { length: 50 }),
  nif:       varchar('nif', { length: 50 }),
  contact:   text('contact'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Dossiers ─────────────────────────────────────────────────────────────────

export const dossiers = pgTable('dossiers', {
  id:          uuid('id').primaryKey().defaultRandom(),
  reference:   varchar('reference', { length: 50 }).notNull().unique(),
  type:        dossierTypeEnum('type').notNull(),
  statut:      dossierStatutEnum('statut').notNull().default('BROUILLON'),
  regimeId:    uuid('regime_id').references(() => regimesDouaniers.id).notNull(),
  clientId:    uuid('client_id').references(() => clients.id).notNull(),
  agentId:     uuid('agent_id').notNull(),  // FK vers Better Auth user
  serviceId:   uuid('service_id').references(() => services.id).notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})

// ─── Documents ────────────────────────────────────────────────────────────────

export const documents = pgTable('documents', {
  id:          uuid('id').primaryKey().defaultRandom(),
  dossierId:   uuid('dossier_id').references(() => dossiers.id, { onDelete: 'cascade' }).notNull(),
  nom:         varchar('nom', { length: 255 }).notNull(),
  typeDoc:     typeDocEnum('type_doc').notNull(),
  storageKey:  text('storage_key').notNull(),
  taille:      integer('taille').notNull(),  // en octets
  uploadedBy:  uuid('uploaded_by').notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id:         uuid('id').primaryKey().defaultRandom(),
  entityType: auditEntityEnum('entity_type').notNull(),
  entityId:   uuid('entity_id'),
  action:     auditActionEnum('action').notNull(),
  userId:     uuid('user_id'),
  payload:    jsonb('payload'),
  ip:         varchar('ip', { length: 45 }),
  userAgent:  text('user_agent'),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('audit_entity_idx').on(t.entityType, t.entityId, t.createdAt),
])
```

**Step 4 : Configurer Drizzle Kit**

Créer `apps/api/drizzle.config.ts` :

```ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema:    './src/db/schema.ts',
  out:       './drizzle',
  dialect:   'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

**Step 5 : Générer et appliquer la migration**

```bash
cd apps/api
bunx drizzle-kit generate
bunx drizzle-kit migrate
```

Résultat attendu : tables créées dans PostgreSQL sans erreur.

**Step 6 : Commit**

```bash
git add apps/api/src/db/ apps/api/drizzle.config.ts apps/api/.env.example apps/api/drizzle/
git commit -m "feat(api): add Drizzle schema and initial migration"
```

---

## Task 5 : Seed des régimes douaniers

**Files:**
- Create: `apps/api/src/db/seed.ts`

**Step 1 : Écrire le script de seed**

Créer `apps/api/src/db/seed.ts` :

```ts
import { db } from './index'
import { regimesDouaniers } from './schema'

const regimes = [
  { code: '40', libelle: 'Mise à la consommation',                   description: 'Importation définitive' },
  { code: '10', libelle: 'Exportation définitive',                   description: null },
  { code: '21', libelle: 'Réexportation',                            description: null },
  { code: '51', libelle: 'Admission temporaire — perfectionnement actif', description: null },
  { code: '53', libelle: 'Admission temporaire simple',              description: null },
  { code: '61', libelle: 'Réimportation',                            description: null },
  { code: '71', libelle: 'Entrepôt douanier',                        description: null },
  { code: '78', libelle: 'Zone franche',                             description: null },
]

await db.insert(regimesDouaniers).values(regimes).onConflictDoNothing()
console.log('Seed régimes douaniers OK')
process.exit(0)
```

**Step 2 : Ajouter le script dans package.json**

Dans `apps/api/package.json`, ajouter dans `"scripts"` :

```json
"seed": "bun run src/db/seed.ts"
```

**Step 3 : Exécuter le seed**

```bash
bun run --cwd apps/api seed
```

Résultat attendu : `Seed régimes douaniers OK`

**Step 4 : Commit**

```bash
git add apps/api/src/db/seed.ts apps/api/package.json
git commit -m "feat(api): add seed script for régimes douaniers"
```

---

## Task 6 : Better Auth — configuration de base

**Files:**
- Create: `apps/api/src/auth/index.ts`
- Create: `apps/api/src/auth/permissions.ts`
- Modify: `apps/api/src/index.ts`

**Step 1 : Définir les permissions RBAC**

Créer `apps/api/src/auth/permissions.ts` :

```ts
import { createAccessControl } from 'better-auth/plugins/access'
import { defaultStatements, adminAc } from 'better-auth/plugins/admin/access'

export const ac = createAccessControl({
  ...defaultStatements,
  dossier:  ['create', 'read', 'update', 'delete', 'reassign'] as const,
  document: ['upload', 'read', 'delete'] as const,
  client:   ['create', 'read', 'update', 'delete'] as const,
  user:     ['create', 'read', 'update', 'delete'] as const,
})

export const adminRole = ac.newRole({
  dossier:  ['create', 'read', 'update', 'delete', 'reassign'],
  document: ['upload', 'read', 'delete'],
  client:   ['create', 'read', 'update', 'delete'],
  user:     ['create', 'read', 'update', 'delete'],
  ...adminAc.statements,
})

export const responsableRole = ac.newRole({
  dossier:  ['create', 'read', 'update', 'reassign'],
  document: ['upload', 'read', 'delete'],
  client:   ['create', 'read', 'update'],
})

export const agentRole = ac.newRole({
  dossier:  ['create', 'read', 'update'],
  document: ['upload', 'read'],
  client:   ['read'],
})

export const superviseurRole = ac.newRole({
  dossier:  ['read'],
  document: ['read'],
  client:   ['read'],
})
```

**Step 2 : Configurer Better Auth**

Créer `apps/api/src/auth/index.ts` :

```ts
import { betterAuth }      from 'better-auth'
import { drizzleAdapter }  from 'better-auth/adapters/drizzle'
import { rbac }            from 'better-auth/plugins/rbac'
import { db }              from '../db'
import { ac, adminRole, responsableRole, agentRole, superviseurRole } from './permissions'

export const auth = betterAuth({
  secret:   process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  plugins: [
    rbac({
      ac,
      roles: {
        admin:       adminRole,
        responsable: responsableRole,
        agent:       agentRole,
        superviseur: superviseurRole,
      },
    }),
  ],
})

export type Auth = typeof auth
```

**Step 3 : Monter le handler Better Auth dans Hono**

Modifier `apps/api/src/index.ts` — ajouter après les imports :

```ts
import { auth }  from './auth'
import { handle } from 'hono/vercel'  // ou adaptateur Bun

// Monter toutes les routes Better Auth sous /api/auth/*
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))
```

**Step 4 : Tester l'endpoint de login**

```bash
bun run --cwd apps/api dev
```

```bash
curl -s -X POST http://localhost:3001/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tranzit.dz","password":"Test1234!","name":"Admin Test"}'
```

Résultat attendu : `{"token":"...","user":{...}}`

**Step 5 : Commit**

```bash
git add apps/api/src/auth/
git commit -m "feat(api): add Better Auth with RBAC plugin (admin, responsable, agent, superviseur)"
```

---

## Task 7 : Middleware d'authentification

**Files:**
- Create: `apps/api/src/middleware/auth.ts`
- Create: `apps/api/src/middleware/audit-context.ts`

**Step 1 : Écrire le test du middleware**

Créer `apps/api/src/middleware/auth.test.ts` :

```ts
import { describe, test, expect } from 'bun:test'
import { Hono } from 'hono'
import { requirePermission } from './auth'

describe('requirePermission middleware', () => {
  test('retourne 401 sans session', async () => {
    const app = new Hono()
    app.get('/test', requirePermission('dossier', 'read'), (c) => c.json({ ok: true }))

    const res = await app.request('/test')
    expect(res.status).toBe(401)
  })
})
```

**Step 2 : Exécuter le test pour vérifier qu'il échoue**

```bash
bun test apps/api/src/middleware/auth.test.ts
```

Résultat attendu : FAIL — `requirePermission is not defined`

**Step 3 : Implémenter le middleware**

Créer `apps/api/src/middleware/auth.ts` :

```ts
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

export async function requirePermission(resource: string, action: string) {
  return async (c: Context, next: Next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers })

    if (!session?.user) {
      return c.json({ error: 'Non authentifié' }, 401)
    }

    const can = await auth.api.userHasPermission({
      userId:     session.user.id,
      permission: { [resource]: [action] },
    })

    if (!can.success) {
      return c.json({ error: 'Non autorisé' }, 403)
    }

    c.set('user', {
      ...session.user,
      ip:        c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
      userAgent: c.req.header('user-agent') ?? '',
    } as AuthUser)

    await next()
  }
}
```

**Step 4 : Créer le middleware de contexte audit**

Créer `apps/api/src/middleware/audit-context.ts` :

```ts
import type { Context, Next } from 'hono'

export async function auditContext(c: Context, next: Next) {
  c.set('ip',        c.req.header('x-forwarded-for') ?? 'unknown')
  c.set('userAgent', c.req.header('user-agent') ?? '')
  await next()
}
```

**Step 5 : Exécuter les tests**

```bash
bun test apps/api/src/middleware/
```

Résultat attendu : PASS

**Step 6 : Commit**

```bash
git add apps/api/src/middleware/
git commit -m "feat(api): add auth middleware with session check and permission guard"
```

---

## Task 8 : Service Audit Trail

**Files:**
- Create: `apps/api/src/services/audit.service.ts`
- Create: `apps/api/src/services/audit.service.test.ts`

**Step 1 : Écrire le test**

Créer `apps/api/src/services/audit.service.test.ts` :

```ts
import { describe, test, expect, mock } from 'bun:test'

describe('logAction', () => {
  test('insère une entrée dans audit_log via la transaction', async () => {
    const insertedValues: unknown[] = []
    const mockTx = {
      insert: () => ({
        values: (v: unknown) => { insertedValues.push(v); return Promise.resolve() }
      })
    }

    const { logAction } = await import('./audit.service')
    const user = { id: 'user-1', ip: '1.2.3.4', userAgent: 'curl' }

    await logAction(mockTx as never, 'CLIENT_CREATED', 'CLIENT', 'client-1', user, { after: { nom: 'ACME' } })

    expect(insertedValues).toHaveLength(1)
    const entry = insertedValues[0] as Record<string, unknown>
    expect(entry.action).toBe('CLIENT_CREATED')
    expect(entry.entityType).toBe('CLIENT')
    expect(entry.entityId).toBe('client-1')
    expect(entry.userId).toBe('user-1')
  })
})
```

**Step 2 : Exécuter le test pour vérifier qu'il échoue**

```bash
bun test apps/api/src/services/audit.service.test.ts
```

Résultat attendu : FAIL — `Cannot find module './audit.service'`

**Step 3 : Implémenter le service**

Créer `apps/api/src/services/audit.service.ts` :

```ts
import type { AuditAction, AuditEntityType } from '@tranzit/types'
import type { DB } from '../db'
import { auditLog } from '../db/schema'

type Tx = Parameters<Parameters<DB['transaction']>[0]>[0]

export interface AuditUser {
  id:        string
  ip:        string
  userAgent: string
}

export async function logAction(
  tx:         Tx,
  action:     AuditAction,
  entityType: AuditEntityType,
  entityId:   string | null,
  user:       AuditUser | null,
  payload?:   Record<string, unknown>,
) {
  await tx.insert(auditLog).values({
    action,
    entityType,
    entityId:  entityId ?? undefined,
    userId:    user?.id ?? undefined,
    ip:        user?.ip ?? undefined,
    userAgent: user?.userAgent ?? undefined,
    payload:   payload ?? undefined,
  })
}
```

**Step 4 : Exécuter les tests**

```bash
bun test apps/api/src/services/audit.service.test.ts
```

Résultat attendu : PASS

**Step 5 : Commit**

```bash
git add apps/api/src/services/
git commit -m "feat(api): add audit trail service with logAction helper"
```

---

## Task 9 : Routes Clients (CRUD)

**Files:**
- Create: `apps/api/src/routes/clients.ts`
- Create: `apps/api/src/routes/clients.test.ts`
- Modify: `apps/api/src/index.ts`

**Step 1 : Écrire les tests des routes clients**

Créer `apps/api/src/routes/clients.test.ts` :

```ts
import { describe, test, expect, beforeAll } from 'bun:test'
import app from '../index'

// Note: ces tests nécessitent une DB de test configurée
// ou un mock de la DB. Pour l'itération initiale,
// on teste uniquement les réponses 401 sans session.

describe('GET /api/v1/clients', () => {
  test('retourne 401 sans authentification', async () => {
    const res = await app.request('/api/v1/clients')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/v1/clients', () => {
  test('retourne 401 sans authentification', async () => {
    const res = await app.request('/api/v1/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nom: 'ACME', type: 'IMPORTATEUR' }),
    })
    expect(res.status).toBe(401)
  })
})
```

**Step 2 : Exécuter les tests pour vérifier qu'ils échouent**

```bash
bun test apps/api/src/routes/clients.test.ts
```

Résultat attendu : FAIL — route non montée, 404

**Step 3 : Implémenter les routes clients**

Créer `apps/api/src/routes/clients.ts` :

```ts
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { clients } from '../db/schema'
import { requirePermission } from '../middleware/auth'
import { logAction } from '../services/audit.service'
import type { AuthUser } from '../middleware/auth'

const router = new Hono()

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
  const body = await c.req.json()
  const user  = c.get('user') as AuthUser

  const [created] = await db.transaction(async (tx) => {
    const rows = await tx.insert(clients).values({
      nom:     body.nom,
      type:    body.type,
      rc:      body.rc ?? null,
      nif:     body.nif ?? null,
      contact: body.contact ?? null,
    }).returning()

    await logAction(tx, 'CLIENT_CREATED', 'CLIENT', rows[0].id, user, { after: rows[0] })
    return rows
  })

  return c.json({ data: created }, 201)
})

// PATCH /api/v1/clients/:id
router.patch('/:id', requirePermission('client', 'update'), async (c) => {
  const id   = c.req.param('id')
  const body = await c.req.json()
  const user = c.get('user') as AuthUser

  const [before] = await db.select().from(clients).where(eq(clients.id, id))
  if (!before) return c.json({ error: 'Client introuvable' }, 404)

  const [after] = await db.transaction(async (tx) => {
    const rows = await tx.update(clients)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning()

    await logAction(tx, 'CLIENT_UPDATED', 'CLIENT', id, user, { before, after: rows[0] })
    return rows
  })

  return c.json({ data: after })
})

// DELETE /api/v1/clients/:id
router.delete('/:id', requirePermission('client', 'delete'), async (c) => {
  const id   = c.req.param('id')
  const user = c.get('user') as AuthUser

  const [client] = await db.select().from(clients).where(eq(clients.id, id))
  if (!client) return c.json({ error: 'Client introuvable' }, 404)

  await db.transaction(async (tx) => {
    await tx.delete(clients).where(eq(clients.id, id))
    await logAction(tx, 'CLIENT_DELETED', 'CLIENT', id, user, { before: client })
  })

  return c.json({ data: null }, 204)
})

export default router
```

**Step 4 : Monter les routes dans index.ts**

Dans `apps/api/src/index.ts`, ajouter :

```ts
import clientsRouter from './routes/clients'
app.route('/api/v1/clients', clientsRouter)
```

**Step 5 : Exécuter les tests**

```bash
bun test apps/api/src/routes/clients.test.ts
```

Résultat attendu : PASS (401 sur toutes les routes non authentifiées)

**Step 6 : Commit**

```bash
git add apps/api/src/routes/clients.ts apps/api/src/routes/clients.test.ts
git commit -m "feat(api): add clients CRUD routes with audit trail"
```

---

## Task 10 : Routes Dossiers (CRUD + workflow statut)

**Files:**
- Create: `apps/api/src/services/dossiers.service.ts`
- Create: `apps/api/src/routes/dossiers.ts`
- Create: `apps/api/src/routes/dossiers.test.ts`
- Modify: `apps/api/src/index.ts`

**Step 1 : Écrire le test du service de workflow**

Créer `apps/api/src/services/dossiers.service.test.ts` :

```ts
import { describe, test, expect } from 'bun:test'
import { canTransition } from './dossiers.service'

describe('canTransition', () => {
  test('BROUILLON → DEPOSE est valide', () => {
    expect(canTransition('BROUILLON', 'DEPOSE')).toBe(true)
  })

  test('CLOTURE → EN_COURS est invalide', () => {
    expect(canTransition('CLOTURE', 'EN_COURS')).toBe(false)
  })

  test('EN_COURS → REJETE est valide', () => {
    expect(canTransition('EN_COURS', 'REJETE')).toBe(true)
  })
})
```

**Step 2 : Exécuter pour vérifier l'échec**

```bash
bun test apps/api/src/services/dossiers.service.test.ts
```

**Step 3 : Implémenter le service dossiers**

Créer `apps/api/src/services/dossiers.service.ts` :

```ts
import type { DossierStatut } from '@tranzit/types'

const TRANSITIONS: Record<DossierStatut, DossierStatut[]> = {
  BROUILLON:  ['DEPOSE'],
  DEPOSE:     ['EN_COURS', 'REJETE'],
  EN_COURS:   ['EN_ATTENTE', 'DEDOUANE', 'REJETE'],
  EN_ATTENTE: ['EN_COURS', 'REJETE'],
  DEDOUANE:   ['CLOTURE'],
  CLOTURE:    [],
  REJETE:     [],
}

export function canTransition(from: DossierStatut, to: DossierStatut): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}
```

**Step 4 : Exécuter les tests du service**

```bash
bun test apps/api/src/services/dossiers.service.test.ts
```

Résultat attendu : PASS

**Step 5 : Implémenter les routes dossiers**

Créer `apps/api/src/routes/dossiers.ts` :

```ts
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { dossiers } from '../db/schema'
import { requirePermission } from '../middleware/auth'
import { logAction } from '../services/audit.service'
import { canTransition } from '../services/dossiers.service'
import type { AuthUser } from '../middleware/auth'
import type { DossierStatut } from '@tranzit/types'

const router = new Hono()

// Génère une référence unique ex. IMP-2026-0001
async function generateReference(type: string): Promise<string> {
  const prefix = type.slice(0, 3).toUpperCase()
  const year   = new Date().getFullYear()
  const count  = await db.$count(dossiers)
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`
}

// GET /api/v1/dossiers
router.get('/', requirePermission('dossier', 'read'), async (c) => {
  const user = c.get('user') as AuthUser
  // TODO Task 11 : filtrage par rôle (agent → ses dossiers, responsable → service)
  const rows = await db.select().from(dossiers).orderBy(dossiers.createdAt)
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
  const body = await c.req.json()
  const user = c.get('user') as AuthUser
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

    await logAction(tx, 'DOSSIER_CREATED', 'DOSSIER', rows[0].id, user, { after: rows[0] })
    return rows
  })

  return c.json({ data: created }, 201)
})

// PATCH /api/v1/dossiers/:id/statut
router.patch('/:id/statut', requirePermission('dossier', 'update'), async (c) => {
  const id      = c.req.param('id')
  const { statut: newStatut } = await c.req.json() as { statut: DossierStatut }
  const user    = c.get('user') as AuthUser

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

    await logAction(tx, 'DOSSIER_STATUS_CHANGED', 'DOSSIER', id, user, {
      before: { statut: dossier.statut },
      after:  { statut: newStatut },
    })
    return rows
  })

  return c.json({ data: updated })
})

// PATCH /api/v1/dossiers/:id/assign
router.patch('/:id/assign', requirePermission('dossier', 'reassign'), async (c) => {
  const id             = c.req.param('id')
  const { agentId }    = await c.req.json()
  const user           = c.get('user') as AuthUser

  const [dossier] = await db.select().from(dossiers).where(eq(dossiers.id, id))
  if (!dossier) return c.json({ error: 'Dossier introuvable' }, 404)

  const [updated] = await db.transaction(async (tx) => {
    const rows = await tx.update(dossiers)
      .set({ agentId, updatedAt: new Date() })
      .where(eq(dossiers.id, id))
      .returning()

    await logAction(tx, 'DOSSIER_ASSIGNED', 'DOSSIER', id, user, {
      before: { agentId: dossier.agentId },
      after:  { agentId },
    })
    return rows
  })

  return c.json({ data: updated })
})

// GET /api/v1/dossiers/:id/audit
router.get('/:id/audit', requirePermission('dossier', 'read'), async (c) => {
  const { auditLog } = await import('../db/schema')
  const { desc }     = await import('drizzle-orm')

  const entries = await db.select().from(auditLog)
    .where(and(eq(auditLog.entityType, 'DOSSIER'), eq(auditLog.entityId, c.req.param('id'))))
    .orderBy(desc(auditLog.createdAt))

  return c.json({ data: entries, meta: { total: entries.length } })
})

export default router
```

**Step 6 : Monter les routes**

Dans `apps/api/src/index.ts`, ajouter :

```ts
import dossiersRouter from './routes/dossiers'
app.route('/api/v1/dossiers', dossiersRouter)
```

**Step 7 : Exécuter tous les tests**

```bash
bun test apps/api/src/
```

Résultat attendu : tous PASS

**Step 8 : Commit**

```bash
git add apps/api/src/services/dossiers.service.ts apps/api/src/services/dossiers.service.test.ts apps/api/src/routes/dossiers.ts
git commit -m "feat(api): add dossiers routes with statut workflow and audit trail"
```

---

## Task 11 : Filtrage des dossiers par rôle

**Files:**
- Modify: `apps/api/src/routes/dossiers.ts`

**Step 1 : Écrire le test de filtrage**

Créer `apps/api/src/services/dossiers-filter.test.ts` :

```ts
import { describe, test, expect } from 'bun:test'
import { buildDossierFilter } from './dossiers.service'

describe('buildDossierFilter', () => {
  test('ADMIN retourne undefined (pas de filtre)', () => {
    const filter = buildDossierFilter({ id: 'u1', role: 'admin', serviceId: 's1' })
    expect(filter).toBeUndefined()
  })

  test('AGENT filtre sur agentId', () => {
    const filter = buildDossierFilter({ id: 'u1', role: 'agent', serviceId: 's1' })
    expect(filter).toBeDefined()
  })

  test('RESPONSABLE filtre sur serviceId', () => {
    const filter = buildDossierFilter({ id: 'u1', role: 'responsable', serviceId: 's1' })
    expect(filter).toBeDefined()
  })
})
```

**Step 2 : Exécuter pour vérifier l'échec**

```bash
bun test apps/api/src/services/dossiers-filter.test.ts
```

**Step 3 : Implémenter buildDossierFilter dans dossiers.service.ts**

Ajouter dans `apps/api/src/services/dossiers.service.ts` :

```ts
import { eq } from 'drizzle-orm'
import { dossiers } from '../db/schema'

interface FilterUser { id: string; role: string; serviceId: string | null }

export function buildDossierFilter(user: FilterUser) {
  if (user.role === 'admin' || user.role === 'superviseur') return undefined
  if (user.role === 'responsable') return eq(dossiers.serviceId, user.serviceId!)
  return eq(dossiers.agentId, user.id)  // agent
}
```

**Step 4 : Utiliser le filtre dans la route GET /**

Dans `apps/api/src/routes/dossiers.ts`, modifier la route `GET /` :

```ts
import { buildDossierFilter } from '../services/dossiers.service'

router.get('/', requirePermission('dossier', 'read'), async (c) => {
  const user   = c.get('user') as AuthUser
  const filter = buildDossierFilter(user)
  const rows   = filter
    ? await db.select().from(dossiers).where(filter).orderBy(dossiers.createdAt)
    : await db.select().from(dossiers).orderBy(dossiers.createdAt)

  return c.json({ data: rows })
})
```

**Step 5 : Exécuter les tests**

```bash
bun test apps/api/src/
```

Résultat attendu : tous PASS

**Step 6 : Commit**

```bash
git add apps/api/src/services/dossiers.service.ts apps/api/src/services/dossiers-filter.test.ts apps/api/src/routes/dossiers.ts
git commit -m "feat(api): apply role-based visibility filter on dossiers list"
```

---

## Task 12 : Stockage S3 + routes Documents

**Files:**
- Create: `apps/api/src/lib/storage.ts`
- Create: `apps/api/src/routes/documents.ts`
- Modify: `apps/api/src/index.ts`

**Step 1 : Implémenter le client S3**

Créer `apps/api/src/lib/storage.ts` :

```ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'

export const s3 = new S3Client({
  endpoint:         process.env.S3_ENDPOINT!,
  region:           process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,  // nécessaire pour MinIO
})

const BUCKET = process.env.S3_BUCKET ?? 'tranzit'

export async function uploadFile(key: string, body: ArrayBuffer, contentType: string) {
  await s3.send(new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    Body:        new Uint8Array(body),
    ContentType: contentType,
  }))
}

export async function getSignedDownloadUrl(key: string, expiresIn = 900): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn })
}

export async function deleteFile(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export function buildStorageKey(
  dossierId: string,
  reference: string,
  typeDoc:   string,
  filename:  string,
): string {
  const year = new Date().getFullYear()
  const uuid = crypto.randomUUID()
  const ext  = filename.split('.').pop()
  return `dossiers/${year}/${reference}/${typeDoc}/${uuid}.${ext}`
}
```

**Step 2 : Implémenter les routes documents**

Créer `apps/api/src/routes/documents.ts` :

```ts
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { documents, dossiers } from '../db/schema'
import { requirePermission } from '../middleware/auth'
import { logAction } from '../services/audit.service'
import { uploadFile, getSignedDownloadUrl, deleteFile, buildStorageKey } from '../lib/storage'
import type { AuthUser } from '../middleware/auth'

const router = new Hono()

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf':  'pdf',
  'image/jpeg':       'jpg',
  'image/png':        'png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}
const MAX_SIZE = 20 * 1024 * 1024  // 20 Mo

// POST /api/v1/dossiers/:dossierId/documents
router.post('/:dossierId/documents', requirePermission('document', 'upload'), async (c) => {
  const dossierId = c.req.param('dossierId')
  const user      = c.get('user') as AuthUser

  const [dossier] = await db.select().from(dossiers).where(eq(dossiers.id, dossierId))
  if (!dossier) return c.json({ error: 'Dossier introuvable' }, 404)

  const formData    = await c.req.formData()
  const file        = formData.get('file') as File
  const typeDoc     = formData.get('typeDoc') as string

  if (!file)                          return c.json({ error: 'Fichier manquant' }, 400)
  if (!ALLOWED_TYPES[file.type])      return c.json({ error: 'Type de fichier non autorisé' }, 400)
  if (file.size > MAX_SIZE)           return c.json({ error: 'Fichier trop volumineux (max 20 Mo)' }, 400)

  const storageKey = buildStorageKey(dossierId, dossier.reference, typeDoc, file.name)
  const buffer     = await file.arrayBuffer()

  await uploadFile(storageKey, buffer, file.type)

  const [doc] = await db.transaction(async (tx) => {
    const rows = await tx.insert(documents).values({
      dossierId,
      nom:        file.name,
      typeDoc:    typeDoc as never,
      storageKey,
      taille:     file.size,
      uploadedBy: user.id,
    }).returning()

    await logAction(tx, 'DOCUMENT_UPLOADED', 'DOCUMENT', rows[0].id, user, {
      meta: { documentId: rows[0].id, nom: file.name, typeDoc },
    })
    return rows
  })

  return c.json({ data: doc }, 201)
})

// GET /api/v1/documents/:id/url
router.get('/:id/url', requirePermission('document', 'read'), async (c) => {
  const [doc] = await db.select().from(documents).where(eq(documents.id, c.req.param('id')))
  if (!doc) return c.json({ error: 'Document introuvable' }, 404)

  const url = await getSignedDownloadUrl(doc.storageKey)
  return c.json({ data: { url, expiresIn: 900 } })
})

// DELETE /api/v1/documents/:id
router.delete('/:id', requirePermission('document', 'delete'), async (c) => {
  const user = c.get('user') as AuthUser
  const [doc] = await db.select().from(documents).where(eq(documents.id, c.req.param('id')))
  if (!doc) return c.json({ error: 'Document introuvable' }, 404)

  await db.transaction(async (tx) => {
    await deleteFile(doc.storageKey)
    await tx.delete(documents).where(eq(documents.id, doc.id))
    await logAction(tx, 'DOCUMENT_DELETED', 'DOCUMENT', doc.id, user, { before: doc })
  })

  return c.json({ data: null }, 204)
})

export default router
```

**Step 3 : Monter les routes**

Dans `apps/api/src/index.ts`, ajouter :

```ts
import documentsRouter from './routes/documents'
app.route('/api/v1/dossiers', documentsRouter)
```

**Step 4 : Commit**

```bash
git add apps/api/src/lib/storage.ts apps/api/src/routes/documents.ts
git commit -m "feat(api): add document upload/download/delete with S3 storage and audit"
```

---

## Task 13 : Routes Sessions / Équipements actifs

**Files:**
- Create: `apps/api/src/routes/sessions.ts`
- Modify: `apps/api/src/index.ts`

**Step 1 : Implémenter les routes sessions**

Créer `apps/api/src/routes/sessions.ts` :

```ts
import { Hono } from 'hono'
import { auth }  from '../auth'
import { db }    from '../db'
import { auditLog } from '../db/schema'
import type { AuthUser } from '../middleware/auth'

const router = new Hono()

// GET /api/v1/auth/sessions — liste mes sessions actives
router.get('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Non authentifié' }, 401)

  const sessions = await auth.api.listSessions({ headers: c.req.raw.headers })
  return c.json({ data: sessions })
})

// DELETE /api/v1/auth/sessions/:id — révoquer un équipement
router.delete('/:id', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Non authentifié' }, 401)

  const sessionId = c.req.param('id')
  await auth.api.revokeSession({ headers: c.req.raw.headers, body: { token: sessionId } })

  await db.insert(auditLog).values({
    action:     'SESSION_REVOKED',
    entityType: 'SESSION',
    entityId:   sessionId,
    userId:     session.user.id,
    ip:         c.req.header('x-forwarded-for') ?? 'unknown',
    userAgent:  c.req.header('user-agent') ?? '',
    payload:    { meta: { revokedSessionId: sessionId } },
  })

  return c.json({ data: null }, 204)
})

// DELETE /api/v1/auth/sessions — révoquer toutes sauf la courante
router.delete('/', async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Non authentifié' }, 401)

  await auth.api.revokeOtherSessions({ headers: c.req.raw.headers })

  await db.insert(auditLog).values({
    action:     'SESSION_REVOKED',
    entityType: 'SESSION',
    entityId:   null,
    userId:     session.user.id,
    ip:         c.req.header('x-forwarded-for') ?? 'unknown',
    payload:    { meta: { scope: 'all_except_current' } },
  })

  return c.json({ data: null }, 204)
})

export default router
```

**Step 2 : Monter les routes**

Dans `apps/api/src/index.ts`, ajouter :

```ts
import sessionsRouter from './routes/sessions'
app.route('/api/v1/auth/sessions', sessionsRouter)
```

**Step 3 : Commit**

```bash
git add apps/api/src/routes/sessions.ts
git commit -m "feat(api): add session management endpoints with audit trail"
```

---

## Task 14 : Vérification finale et build

**Step 1 : Exécuter tous les tests**

```bash
bun test apps/api/src/
```

Résultat attendu : tous PASS, aucun test en rouge.

**Step 2 : Vérifier le type check**

```bash
cd apps/api && bunx tsc --noEmit
```

Résultat attendu : aucune erreur TypeScript.

**Step 3 : Tester le démarrage de l'API complète**

```bash
bun run --cwd apps/api dev
```

```bash
curl http://localhost:3001/api/v1/health
```

Résultat attendu : `{"status":"ok","ts":"..."}`

**Step 4 : Vérifier que le frontend Next.js tourne toujours**

```bash
bun run dev
```

Ouvrir `http://localhost:34000` — pas de régression.

**Step 5 : Commit final**

```bash
git add .
git commit -m "feat(api): complete backend implementation — clients, dossiers, documents, sessions, audit"
```

---

## Récapitulatif des tâches

| # | Tâche | Commit |
|---|-------|--------|
| 1 | Monorepo Bun workspaces | `chore: initialize Bun workspaces` |
| 2 | Types partagés | `feat(types): add shared domain types` |
| 3 | Hono bootstrap | `feat(api): bootstrap Hono app` |
| 4 | Schéma Drizzle + migration | `feat(api): add Drizzle schema and migration` |
| 5 | Seed régimes douaniers | `feat(api): add seed script` |
| 6 | Better Auth + RBAC | `feat(api): add Better Auth with RBAC` |
| 7 | Middleware auth | `feat(api): add auth middleware` |
| 8 | Service audit trail | `feat(api): add audit trail service` |
| 9 | Routes clients | `feat(api): add clients CRUD routes` |
| 10 | Routes dossiers + workflow | `feat(api): add dossiers routes with workflow` |
| 11 | Filtrage par rôle | `feat(api): apply role-based visibility filter` |
| 12 | GED / S3 + routes documents | `feat(api): add document upload with S3` |
| 13 | Routes sessions | `feat(api): add session management endpoints` |
| 14 | Vérification finale | `feat(api): complete backend implementation` |
