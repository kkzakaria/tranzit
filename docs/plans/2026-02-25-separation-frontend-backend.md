# Séparation Frontend / Backend — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extraire `apps/api/` dans un repo `tranzit-api` indépendant avec un contrat OpenAPI auto-généré, et nettoyer le repo `tranzit` (renommé `tranzit-web`) de tout code backend.

**Architecture:** Deux repos git distincts. Le backend expose `/openapi.json` via `@hono/zod-openapi`. Le frontend génère `types/api.ts` depuis ce spec avec `openapi-typescript`. Aucun package partagé.

**Tech Stack:** Bun, Hono + `@hono/zod-openapi`, `@scalar/hono-api-reference`, `openapi-typescript`, Drizzle, better-auth.

---

## Task 1 : Créer le repo `tranzit-api` sur GitHub

**Files:**
- Aucun fichier à modifier dans ce repo — action GitHub manuelle

**Step 1 : Créer le repo sur GitHub**

Sur https://github.com/new :
- Nom : `tranzit-api`
- Visibilité : privé (cohérent avec `tranzit`)
- Ne pas initialiser avec README

**Step 2 : Init git local depuis `apps/api/`**

```bash
cd /home/superz/development
cp -r tranzit/apps/api tranzit-api
cd tranzit-api
git init
git remote add origin git@github.com:kkzakaria/tranzit-api.git
```

**Step 3 : Premier commit**

```bash
git add .
git commit -m "chore: initial commit from tranzit/apps/api"
git branch -M main
git push -u origin main
```

**Step 4 : Vérifier que le backend tourne seul**

```bash
cd /home/superz/development/tranzit-api
bun install
bun run dev
# Attendu : "API running on http://localhost:34001"
```

**Step 5 : Lancer les tests existants**

```bash
bun test
# Attendu : tous les tests passent (baseline verte)
```

---

## Task 2 : Internaliser `packages/types/` dans `tranzit-api`

Le package `@tranzit/types` était un workspace partagé. Il ne sera plus partagé — on le copie directement dans le repo API.

**Files:**
- Create: `src/types/index.ts`
- Create: `src/types/dossier.ts`
- Create: `src/types/client.ts`
- Create: `src/types/audit.ts`
- Modify: `package.json` (supprimer `@tranzit/types` des deps si présent)

**Step 1 : Copier les fichiers de types**

```bash
cd /home/superz/development/tranzit-api
mkdir -p src/types
cp /home/superz/development/tranzit/packages/types/src/*.ts src/types/
```

**Step 2 : Remplacer les imports `@tranzit/types` → relatifs**

Fichiers concernés :
- `src/routes/dossiers.ts` — importe `DossierType`, `DossierStatut`
- `src/routes/documents.ts` — importe `TYPE_DOC_VALUES`, `MAX_DOCUMENT_SIZE`, `TypeDoc`
- `src/services/audit.service.ts`
- `src/services/dossiers.service.ts`
- `src/middleware/auth.ts`

Remplacer dans chaque fichier :

```ts
// Avant
import type { DossierType, DossierStatut } from '@tranzit/types'
import { TYPE_DOC_VALUES, MAX_DOCUMENT_SIZE } from '@tranzit/types'

// Après
import type { DossierType, DossierStatut } from '../types'
import { TYPE_DOC_VALUES, MAX_DOCUMENT_SIZE } from '../types'
```

(Adapter le chemin relatif selon la profondeur du fichier.)

**Step 3 : Supprimer la dépendance workspace de `package.json`**

Dans `package.json`, retirer :
```json
"@tranzit/types": "workspace:*"
```

**Step 4 : Vérifier le typage**

```bash
npx tsc --noEmit
# Attendu : 0 erreurs
```

**Step 5 : Relancer les tests**

```bash
bun test
# Attendu : même résultat vert qu'au Task 1
```

**Step 6 : Commit**

```bash
git add .
git commit -m "refactor: inline @tranzit/types as src/types (no more workspace dep)"
```

---

## Task 3 : Installer les dépendances OpenAPI

**Files:**
- Modify: `package.json`

**Step 1 : Installer les packages**

```bash
cd /home/superz/development/tranzit-api
bun add @hono/zod-openapi @scalar/hono-api-reference
```

**Step 2 : Vérifier l'installation**

```bash
bun run dev
# Attendu : démarre sans erreur
```

**Step 3 : Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add @hono/zod-openapi and @scalar/hono-api-reference"
```

---

## Task 4 : Convertir `src/index.ts` vers `OpenAPIHono`

**Files:**
- Modify: `src/index.ts`

**Step 1 : Vérifier que les tests sont verts avant de toucher**

```bash
bun test
```

**Step 2 : Mettre à jour `src/index.ts`**

```ts
import { OpenAPIHono } from '@hono/zod-openapi'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { apiReference } from '@scalar/hono-api-reference'
import { auth } from './auth'
import sessionsRouter from './routes/sessions'
import clientsRouter from './routes/clients'
import dossiersRouter from './routes/dossiers'
import documentsRouter from './routes/documents'

const app = new OpenAPIHono()

app.use('*', logger())
app.use('*', cors({
  origin:      process.env.WEB_URL ?? 'http://localhost:34000',
  credentials: true,
}))

app.onError((err, c) => {
  console.error('[api] erreur non gérée', { method: c.req.method, path: c.req.path, err })
  return c.json({ error: 'Une erreur interne est survenue' }, 500)
})

app.get('/api/v1/health', (c) => c.json({ status: 'ok', ts: new Date().toISOString() }))

// Spec OpenAPI — point d'entrée pour openapi-typescript côté frontend
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: { title: 'Tranzit API', version: '1.0.0' },
})

// UI interactive (dev uniquement)
app.get('/docs', apiReference({ spec: { url: '/openapi.json' } }))

app.route('/api/v1/auth/sessions', sessionsRouter)
app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))
app.route('/api/v1/clients', clientsRouter)
app.route('/api/v1/dossiers', dossiersRouter)
app.route('/api/v1/dossiers', documentsRouter)
app.route('/api/v1/documents', documentsRouter)

export default app

const port = Number(process.env.PORT ?? 34001)
console.log(`API running on http://localhost:${port}`)
Bun.serve({ fetch: app.fetch, port })
```

**Step 3 : Vérifier que les tests passent encore**

```bash
bun test
# Les tests existants utilisent `app.request()` — ils fonctionnent avec OpenAPIHono
```

**Step 4 : Tester l'endpoint `/openapi.json` manuellement**

```bash
bun run dev &
curl http://localhost:34001/openapi.json
# Attendu : JSON avec openapi: "3.0.0" et paths vide {} (pas encore de routes converties)
```

**Step 5 : Commit**

```bash
git add src/index.ts
git commit -m "feat: switch to OpenAPIHono and expose /openapi.json + /docs"
```

---

## Task 5 : Convertir `src/routes/clients.ts` vers zod-openapi

`@hono/zod-openapi` re-exporte `z` depuis `zod` avec `.openapi()`. Importer `z` depuis `@hono/zod-openapi` au lieu de `zod` pour bénéficier des enrichissements de description OpenAPI.

**Files:**
- Modify: `src/routes/clients.ts`
- Test: `src/routes/clients.test.ts`

**Step 1 : Vérifier la baseline**

```bash
bun test src/routes/clients.test.ts
```

**Step 2 : Réécrire `src/routes/clients.ts`**

```ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { clients } from '../db/schema'
import { requirePermission } from '../middleware/auth'
import { logAction } from '../services/audit.service'
import type { AuthUser } from '../middleware/auth'

type Variables = { user: AuthUser }
const router = new OpenAPIHono<{ Variables: Variables }>()

const ClientSchema = z.object({
  nom:     z.string().min(1).openapi({ description: 'Nom du client' }),
  type:    z.enum(['IMPORTATEUR', 'EXPORTATEUR', 'LES_DEUX']).openapi({ description: 'Type de client' }),
  rc:      z.string().optional().openapi({ description: 'Registre de commerce' }),
  nif:     z.string().optional().openapi({ description: 'Numéro d\'identification fiscale' }),
  contact: z.string().optional().openapi({ description: 'Contact' }),
})

const ClientResponseSchema = ClientSchema.extend({
  id:        z.string().openapi({ description: 'UUID' }),
  createdAt: z.string().openapi({ description: 'Date de création ISO 8601' }),
  updatedAt: z.string().openapi({ description: 'Date de modification ISO 8601' }),
})

const IdParamSchema = z.object({
  id: z.string().openapi({ description: 'UUID du client', example: '550e8400-e29b-41d4-a716-446655440000' }),
})

const ErrorSchema = z.object({ error: z.string() })

// GET /
router.openapi(createRoute({
  method: 'get', path: '/',
  tags: ['Clients'],
  responses: {
    200: { content: { 'application/json': { schema: z.object({ data: z.array(ClientResponseSchema) }) } }, description: 'Liste des clients' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Non authentifié' },
  },
}), requirePermission('client', 'read') as never, async (c) => {
  const rows = await db.select().from(clients).orderBy(clients.nom)
  return c.json({ data: rows })
})

// GET /:id
router.openapi(createRoute({
  method: 'get', path: '/{id}',
  tags: ['Clients'],
  request: { params: IdParamSchema },
  responses: {
    200: { content: { 'application/json': { schema: z.object({ data: ClientResponseSchema }) } }, description: 'Client' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Non authentifié' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Introuvable' },
  },
}), requirePermission('client', 'read') as never, async (c) => {
  const { id } = c.req.valid('param')
  const [client] = await db.select().from(clients).where(eq(clients.id, id))
  if (!client) return c.json({ error: 'Client introuvable' }, 404)
  return c.json({ data: client })
})

// POST /
router.openapi(createRoute({
  method: 'post', path: '/',
  tags: ['Clients'],
  request: { body: { content: { 'application/json': { schema: ClientSchema } }, required: true } },
  responses: {
    201: { content: { 'application/json': { schema: z.object({ data: ClientResponseSchema }) } }, description: 'Créé' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Données invalides' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Non authentifié' },
  },
}), requirePermission('client', 'create') as never, async (c) => {
  const data = c.req.valid('json')
  const user = c.get('user')
  const [created] = await db.transaction(async (tx) => {
    const rows = await tx.insert(clients).values({
      nom: data.nom, type: data.type,
      rc: data.rc ?? null, nif: data.nif ?? null, contact: data.contact ?? null,
    }).returning()
    await logAction(tx as never, { entityType: 'CLIENT', action: 'CLIENT_CREATED' }, rows[0].id, user, { after: rows[0] })
    return rows
  })
  return c.json({ data: created }, 201)
})

// PATCH /:id
router.openapi(createRoute({
  method: 'patch', path: '/{id}',
  tags: ['Clients'],
  request: {
    params: IdParamSchema,
    body: { content: { 'application/json': { schema: ClientSchema.partial() } }, required: true },
  },
  responses: {
    200: { content: { 'application/json': { schema: z.object({ data: ClientResponseSchema }) } }, description: 'Mis à jour' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Données invalides' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Non authentifié' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Introuvable' },
  },
}), requirePermission('client', 'update') as never, async (c) => {
  const { id } = c.req.valid('param')
  const data   = c.req.valid('json')
  const user   = c.get('user')
  const [before] = await db.select().from(clients).where(eq(clients.id, id))
  if (!before) return c.json({ error: 'Client introuvable' }, 404)
  const [after] = await db.transaction(async (tx) => {
    const rows = await tx.update(clients).set({
      ...(data.nom     !== undefined && { nom:     data.nom }),
      ...(data.type    !== undefined && { type:    data.type }),
      ...(data.rc      !== undefined && { rc:      data.rc }),
      ...(data.nif     !== undefined && { nif:     data.nif }),
      ...(data.contact !== undefined && { contact: data.contact }),
      updatedAt: new Date(),
    }).where(eq(clients.id, id)).returning()
    await logAction(tx as never, { entityType: 'CLIENT', action: 'CLIENT_UPDATED' }, id, user, { before, after: rows[0] })
    return rows
  })
  return c.json({ data: after })
})

// DELETE /:id
router.openapi(createRoute({
  method: 'delete', path: '/{id}',
  tags: ['Clients'],
  request: { params: IdParamSchema },
  responses: {
    204: { description: 'Supprimé' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Non authentifié' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Introuvable' },
  },
}), requirePermission('client', 'delete') as never, async (c) => {
  const { id } = c.req.valid('param')
  const user   = c.get('user')
  const [client] = await db.select().from(clients).where(eq(clients.id, id))
  if (!client) return c.json({ error: 'Client introuvable' }, 404)
  await db.transaction(async (tx) => {
    await tx.delete(clients).where(eq(clients.id, id))
    await logAction(tx as never, { entityType: 'CLIENT', action: 'CLIENT_DELETED' }, id, user, { before: client })
  })
  return new Response(null, { status: 204 })
})

export default router
```

> **Note sur le middleware `requirePermission` :** le cast `as never` est nécessaire car `requirePermission` retourne un middleware Hono standard (`MiddlewareHandler`) mais `openapi()` attend un type légèrement différent. C'est un contournement connu avec `@hono/zod-openapi` — le comportement runtime est identique.

**Step 3 : Vérifier les types**

```bash
npx tsc --noEmit
```

**Step 4 : Relancer les tests**

```bash
bun test src/routes/clients.test.ts
# Attendu : même résultat vert
```

**Step 5 : Commit**

```bash
git add src/routes/clients.ts
git commit -m "feat: convert clients route to zod-openapi"
```

---

## Task 6 : Convertir `src/routes/sessions.ts` vers zod-openapi

**Files:**
- Modify: `src/routes/sessions.ts`
- Test: `src/routes/sessions.test.ts`

**Step 1 : Baseline**

```bash
bun test src/routes/sessions.test.ts
```

**Step 2 : Réécrire `src/routes/sessions.ts`**

```ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { db } from '../db'
import { auditLog } from '../db/schema'

const router = new OpenAPIHono()

const ErrorSchema = z.object({ error: z.string() })
const IdParamSchema = z.object({ id: z.string().openapi({ description: 'Token de session' }) })

// GET /
router.openapi(createRoute({
  method: 'get', path: '/',
  tags: ['Sessions'],
  responses: {
    200: { content: { 'application/json': { schema: z.object({ data: z.array(z.unknown()) }) } }, description: 'Sessions actives' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Non authentifié' },
    503: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Service auth indisponible' },
  },
}), async (c) => {
  const { auth } = await import('../auth')
  let session: Awaited<ReturnType<typeof auth.api.getSession>>
  try {
    session = await auth.api.getSession({ headers: c.req.raw.headers })
  } catch (err) {
    console.error('[sessions] getSession a échoué', err)
    return c.json({ error: 'Service d\'authentification indisponible' }, 503)
  }
  if (!session) return c.json({ error: 'Non authentifié' }, 401)
  const sessions = await auth.api.listSessions({ headers: c.req.raw.headers })
  return c.json({ data: sessions })
})

// DELETE /:id
router.openapi(createRoute({
  method: 'delete', path: '/{id}',
  tags: ['Sessions'],
  request: { params: IdParamSchema },
  responses: {
    200: { content: { 'application/json': { schema: z.object({ success: z.boolean() }) } }, description: 'Révoquée' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Non authentifié' },
  },
}), async (c) => {
  const { auth } = await import('../auth')
  const { id } = c.req.valid('param')
  let session: Awaited<ReturnType<typeof auth.api.getSession>>
  try {
    session = await auth.api.getSession({ headers: c.req.raw.headers })
  } catch {
    return c.json({ error: 'Non authentifié' }, 401)
  }
  if (!session) return c.json({ error: 'Non authentifié' }, 401)
  await auth.api.revokeSession({ headers: c.req.raw.headers, body: { token: id } })

  // Log de révocation
  const { auditLog: auditLogTable } = await import('../db/schema')
  await db.insert(auditLogTable).values({
    entityType: 'SESSION',
    entityId:   null,
    action:     'SESSION_REVOKED',
    userId:     session.user.id,
    payload:    { revokedSessionToken: id },
  })
  return c.json({ success: true })
})

export default router
```

**Step 3 : Tests + typage**

```bash
bun test src/routes/sessions.test.ts
npx tsc --noEmit
```

**Step 4 : Commit**

```bash
git add src/routes/sessions.ts
git commit -m "feat: convert sessions route to zod-openapi"
```

---

## Task 7 : Convertir `src/routes/dossiers.ts` vers zod-openapi

**Files:**
- Modify: `src/routes/dossiers.ts`
- Test: `src/routes/dossiers.test.ts`

**Step 1 : Baseline**

```bash
bun test src/routes/dossiers.test.ts
```

**Step 2 : Mettre à jour les imports**

Remplacer en tête de fichier :

```ts
// Avant
import { Hono } from 'hono'
import { z } from 'zod'

// Après
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
```

Remplacer `new Hono<...>()` par `new OpenAPIHono<...>()`.

**Step 3 : Extraire les schémas Zod existants avec `.openapi()`**

Les schémas `CreateDossierSchema`, `UpdateStatutSchema`, etc. existent déjà. Ajouter `.openapi({ description: '...' })` sur les champs clés :

```ts
const CreateDossierSchema = z.object({
  type:          z.enum(['IMPORT', 'EXPORT', 'TRANSIT', 'ADMISSION_TEMPORAIRE']).openapi({ description: 'Type de dossier' }),
  clientId:      z.string().openapi({ description: 'UUID du client' }),
  marchandise:   z.string().min(1).openapi({ description: 'Description de la marchandise' }),
  valeurDouane:  z.number().positive().optional().openapi({ description: 'Valeur en douane (DZD)' }),
  notes:         z.string().optional(),
})
```

**Step 4 : Convertir chaque route `.get/.post/.patch/.delete` vers `.openapi(createRoute(...), handler)`**

Pattern identique à `clients.ts` — `createRoute` avec `method`, `path`, `tags: ['Dossiers']`, `request`, `responses`. Utiliser `c.req.valid('param')` et `c.req.valid('json')` dans les handlers.

**Step 5 : Tests + typage**

```bash
bun test src/routes/dossiers.test.ts
npx tsc --noEmit
```

**Step 6 : Commit**

```bash
git add src/routes/dossiers.ts
git commit -m "feat: convert dossiers route to zod-openapi"
```

---

## Task 8 : Convertir `src/routes/documents.ts` vers zod-openapi

> **Note :** `documents.ts` utilise `multipart/form-data` pour l'upload. `@hono/zod-openapi` supporte ce type avec `z.instanceof(File)`. La validation du `typeDoc` reste manuelle car les valeurs viennent de `src/types/dossier.ts`.

**Files:**
- Modify: `src/routes/documents.ts`
- Test: `src/routes/documents.test.ts`

**Step 1 : Baseline**

```bash
bun test src/routes/documents.test.ts
```

**Step 2 : Mettre à jour les imports**

```ts
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
```

**Step 3 : Définir les schémas pour les routes de documents**

```ts
const UploadFormSchema = z.object({
  file:    z.instanceof(File).openapi({ description: 'Fichier à uploader' }),
  typeDoc: z.string().openapi({ description: `Type du document. Valeurs : ${TYPE_DOC_VALUES.join(', ')}` }),
})

const DocumentResponseSchema = z.object({
  id:         z.string(),
  dossierId:  z.string(),
  nom:        z.string(),
  typeDoc:    z.string(),
  storageKey: z.string(),
  mimeType:   z.string(),
  taille:     z.number(),
  uploadedAt: z.string(),
})

const ErrorSchema = z.object({ error: z.string() })
```

**Step 4 : Convertir les routes**

Route upload (`POST /:dossierId/documents`) :

```ts
router.openapi(createRoute({
  method: 'post', path: '/{dossierId}/documents',
  tags: ['Documents'],
  request: {
    params: z.object({ dossierId: z.string() }),
    body: { content: { 'multipart/form-data': { schema: UploadFormSchema } }, required: true },
  },
  responses: {
    201: { content: { 'application/json': { schema: z.object({ data: DocumentResponseSchema }) } }, description: 'Document uploadé' },
    400: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Fichier ou typeDoc invalide' },
    401: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Non authentifié' },
    404: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Dossier introuvable' },
  },
}), requirePermission('document', 'upload') as never, async (c) => {
  // Le corps du handler ne change pas (utilise encore c.req.formData() — multipart non validé par zod-openapi)
  // ...
})
```

Routes GET et DELETE : même pattern que `clients.ts`.

**Step 5 : Tests + typage**

```bash
bun test src/routes/documents.test.ts
npx tsc --noEmit
```

**Step 6 : Vérifier le spec complet**

```bash
bun run dev &
curl http://localhost:34001/openapi.json | bun run -e "const j = await Bun.stdin.text(); console.log(Object.keys(JSON.parse(j).paths).join('\n'))"
# Attendu : toutes les routes /api/v1/* apparaissent
```

**Step 7 : Commit**

```bash
git add src/routes/documents.ts
git commit -m "feat: convert documents route to zod-openapi"
```

---

## Task 9 : Nettoyer `tranzit-web` — supprimer le code backend

On travaille maintenant dans le repo `tranzit` (renommé `tranzit-web` sur GitHub après cette tâche).

**Files:**
- Delete: `apps/` (répertoire entier)
- Delete: `packages/` (répertoire entier)
- Delete: `app/api/` (répertoire entier)
- Modify: `package.json`
- Modify: `tsconfig.json` (si nécessaire)

**Step 1 : Supprimer les dossiers backend**

```bash
cd /home/superz/development/tranzit
rm -rf apps/ packages/ app/api/
```

**Step 2 : Mettre à jour `package.json`**

Supprimer la clé `workspaces` et le script `dev:api` :

```json
{
  "name": "tranzit-web",
  "scripts": {
    "dev":   "next dev --port 34000",
    "build": "next build",
    "start": "next start",
    "lint":  "eslint"
  }
}
```

Retirer également de `dependencies` si présent : `@tranzit/types`.

**Step 3 : Vérifier le build**

```bash
bun install
bun run build
# Attendu : build Next.js réussi sans erreurs
```

**Step 4 : Renommer le repo sur GitHub**

Settings → General → Repository name → `tranzit-web` → Rename.

**Step 5 : Mettre à jour la remote locale**

```bash
git remote set-url origin git@github.com:kkzakaria/tranzit-web.git
```

**Step 6 : Commit**

```bash
git add -A
git commit -m "chore: remove apps/api, packages/types — backend now lives in tranzit-api"
```

---

## Task 10 : Ajouter `gen:types` au frontend

**Files:**
- Modify: `package.json`
- Create: `types/api.ts` (généré automatiquement)

**Step 1 : Installer `openapi-typescript`**

```bash
cd /home/superz/development/tranzit
bun add -d openapi-typescript
```

**Step 2 : Ajouter le script dans `package.json`**

```json
"scripts": {
  "gen:types": "openapi-typescript http://localhost:34001/openapi.json -o types/api.ts"
}
```

**Step 3 : S'assurer que le backend tourne, puis générer**

```bash
# Dans un autre terminal, depuis tranzit-api :
bun run dev

# Puis depuis tranzit-web :
bun run gen:types
# Attendu : types/api.ts créé
```

**Step 4 : Vérifier le contenu généré**

```bash
head -50 types/api.ts
# Attendu : interfaces TypeScript correspondant aux schémas Hono
```

**Step 5 : Commit**

```bash
git add package.json bun.lock types/api.ts
git commit -m "chore: add gen:types script and initial generated API types"
```

---

## Task 11 : Mettre à jour `hooks/use-file-explorer.ts`

C'est le seul fichier frontend qui fait des appels API. Actuellement il appelle `app/api/projects/` (routes stubs supprimées). Il faut le pointer vers le backend Hono.

**Files:**
- Modify: `hooks/use-file-explorer.ts`

**Step 1 : Lire le fichier**

```bash
cat hooks/use-file-explorer.ts
```

**Step 2 : Pointer vers l'API Hono**

Remplacer les appels vers `/api/projects/...` par `${process.env.NEXT_PUBLIC_API_URL}/api/v1/...`.

Ajouter dans `.env.local` (non commité) :

```env
NEXT_PUBLIC_API_URL=http://localhost:34001
```

**Step 3 : Utiliser les types générés**

Importer depuis `@/types/api` pour typer les réponses :

```ts
import type { components } from '@/types/api'
type FileItem = components['schemas']['...'] // adapter au nom réel dans le spec
```

**Step 4 : Vérifier le typage**

```bash
npx tsc --noEmit
```

**Step 5 : Vérifier le dev server**

```bash
bun run dev
# Attendu : démarre sur port 34000, aucune erreur de build
```

**Step 6 : Commit**

```bash
git add hooks/use-file-explorer.ts .env.local.example
git commit -m "feat: point file explorer hook to tranzit-api via NEXT_PUBLIC_API_URL"
```

---

## Récapitulatif des repos finaux

| Repo | Contenu | Port dev |
|------|---------|----------|
| `tranzit-api` | Hono + OpenAPIHono + Drizzle + better-auth | 34001 |
| `tranzit-web` | Next.js 16 + React 19 + Tailwind v4 | 34000 |

Le spec OpenAPI est accessible sur `http://localhost:34001/openapi.json`.
La documentation interactive est sur `http://localhost:34001/docs`.
Les types frontend se régénèrent avec `bun run gen:types` depuis `tranzit-web`.
