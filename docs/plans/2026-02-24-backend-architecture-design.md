# Design — Architecture Backend Tranzit

**Date :** 2026-02-24
**Statut :** Validé
**Contexte :** PME multi-agences, gestion et suivi de dossiers pour concessionnaire en douane

---

## 1. Structure du monorepo

### Choix : monorepo Bun workspaces avec API Hono séparée

L'API backend vit dans `apps/api`, indépendante du frontend Next.js. Les types métier sont partagés via `packages/types`.

```
tranzit/
├── apps/
│   ├── web/                        ← Next.js 16 (frontend actuel)
│   └── api/                        ← Backend Hono sur Bun
│       ├── src/
│       │   ├── index.ts            ← Entry point, instance Hono
│       │   ├── auth/
│       │   │   ├── index.ts        ← Configuration Better Auth
│       │   │   └── permissions.ts  ← Définition rôles + permissions RBAC
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── dossiers.ts
│       │   │   ├── clients.ts
│       │   │   └── documents.ts
│       │   ├── services/           ← Logique métier (pas de SQL direct)
│       │   ├── db/
│       │   │   ├── schema.ts       ← Schéma Drizzle
│       │   │   └── index.ts        ← Connexion PostgreSQL
│       │   └── middleware/
│       │       ├── auth.ts         ← Vérification session + injection user
│       │       └── audit.ts        ← Contexte audit (IP, userAgent)
│       └── package.json
├── packages/
│   └── types/                      ← Types partagés web ↔ api
│       ├── dossier.ts
│       ├── client.ts
│       └── index.ts
├── package.json                    ← Workspaces Bun
└── bun.lock
```

### Stack technique

| Couche | Technologie |
|--------|-------------|
| Runtime | Bun |
| Framework API | Hono.js |
| ORM | Drizzle ORM |
| Base de données | PostgreSQL |
| Authentification | Better Auth + plugin RBAC |
| Stockage fichiers | S3-compatible (MinIO / Cloudflare R2 / AWS S3) |
| Audit | Table `audit_log` append-only |

### Conventions API

- Préfixe : `/api/v1/`
- Réponses JSON uniformes : `{ data, meta?, error? }`
- Pagination cursor-based sur les listes
- Hono sur le port **3001**, Next.js sur **34000**

---

## 2. Modèle de données

### Hiérarchie organisationnelle

```
entreprise (mono-tenant)
└── départements
    └── services
        └── users
            └── dossiers (agent_id + service_id)
```

### Schéma complet

```
┌─────────────────┐
│  departements   │
├─────────────────┤
│ id              │
│ nom             │   ex. "Import", "Export", "Transit"
│ description     │
└────────┬────────┘
         │
┌────────┴────────┐
│    services     │
├─────────────────┤
│ id              │
│ nom             │
│ departement_id  │
└────────┬────────┘
         │
┌────────┴────────┐       ┌──────────────────────┐
│     users       │       │  regimes_douaniers   │
├─────────────────┤       ├──────────────────────┤
│ id              │       │ id                   │
│ email           │       │ code                 │
│ nom             │       │ libelle              │
│ role            │       │ description          │
│ service_id      │       │ actif                │
└─────────────────┘       └──────────┬───────────┘
                                     │
┌─────────────────┐       ┌──────────┴──────────┐
│    clients      │       │      dossiers        │
├─────────────────┤       ├─────────────────────┤
│ id              │◄──────┤ id                  │
│ nom             │       │ reference           │
│ type            │       │ type                │
│ rc / nif        │       │ statut              │
│ contact         │       │ regime_id           │
└─────────────────┘       │ client_id           │
                          │ agent_id            │
                          │ service_id          │
                          │ created_at          │
                          │ updated_at          │
                          └──────────┬──────────┘
                                     │
                          ┌──────────┴──────────┐
                          │      documents       │
                          ├─────────────────────┤
                          │ id                  │
                          │ dossier_id          │
                          │ nom                 │
                          │ type_doc            │
                          │ storage_key         │
                          │ taille              │
                          │ uploaded_by         │
                          │ created_at          │
                          └─────────────────────┘

┌─────────────────────────────┐
│          audit_log          │  ← append-only, toutes entités
├─────────────────────────────┤
│ id                          │
│ entity_type                 │
│ entity_id                   │
│ action                      │
│ user_id                     │
│ payload (jsonb)             │
│ ip                          │
│ user_agent                  │
│ created_at                  │
└─────────────────────────────┘
```

### Enums métier

**`dossiers.statut`**
```
BROUILLON → DEPOSE → EN_COURS → EN_ATTENTE → DEDOUANE → CLOTURE | REJETE
```

**`dossiers.type`**
```
IMPORT | EXPORT | TRANSIT | ADMISSION_TEMPORAIRE
```

**`clients.type`**
```
IMPORTATEUR | EXPORTATEUR | LES_DEUX
```

**`documents.type_doc`**
```
FACTURE | CONNAISSEMENT | CERTIFICAT_ORIGINE | LISTE_COLISAGE
DECLARATION | LICENCE | BON_COMMANDE | AUTRE
```

### Régimes douaniers (données de référence — seed)

| Code | Libellé |
|------|---------|
| `40` | Mise à la consommation (import définitif) |
| `10` | Exportation définitive |
| `21` | Réexportation |
| `51` | Admission temporaire — perfectionnement actif |
| `53` | Admission temporaire simple |
| `61` | Réimportation |
| `71` | Entrepôt douanier |
| `78` | Zone franche |

Le champ `actif` permet de masquer un régime obsolète sans casser l'historique des dossiers existants.

---

## 3. Authentification — Better Auth + plugin RBAC

### Flux d'authentification

Better Auth gère les sessions via `httpOnly` cookies. Le token de session est vérifié à chaque requête via `auth.api.getSession()`.

### Configuration

```ts
// auth/index.ts
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  plugins: [
    rbac({
      ac,
      roles: { admin, responsable, agent, superviseur }
    })
  ]
})
```

### Rôles et permissions

| Rôle | Profil |
|------|--------|
| `ADMIN` | Accès total — gère utilisateurs, référentiels, tous les dossiers |
| `RESPONSABLE` | Gère tous les dossiers de son service, peut réassigner |
| `AGENT` | Crée et gère ses propres dossiers, upload documents |
| `SUPERVISEUR` | Lecture seule sur tous les services |

```ts
// auth/permissions.ts
export const ac = createAccessControl({
  dossier:  ['create', 'read', 'update', 'delete', 'reassign'],
  document: ['upload', 'read', 'delete'],
  client:   ['create', 'read', 'update', 'delete'],
  user:     ['create', 'read', 'update', 'delete'],
})

export const admin       = ac.newRole({ dossier: ['create','read','update','delete','reassign'], document: ['upload','read','delete'], client: ['create','read','update','delete'], user: ['create','read','update','delete'] })
export const responsable = ac.newRole({ dossier: ['create','read','update','reassign'],          document: ['upload','read','delete'], client: ['create','read','update'] })
export const agent       = ac.newRole({ dossier: ['create','read','update'],                    document: ['upload','read'],          client: ['read'] })
export const superviseur = ac.newRole({ dossier: ['read'],                                      document: ['read'],                   client: ['read'] })
```

### Règles de visibilité des dossiers

```
ADMIN / SUPERVISEUR  → tous les dossiers
RESPONSABLE          → dossiers de son service
AGENT                → ses dossiers uniquement
```

### Sessions & équipements actifs

La table `session` de Better Auth est étendue avec :
- `deviceName` — nom lisible de l'appareil (ex. "Chrome — Windows 11")
- `lastActiveAt` — horodatage de la dernière requête

Endpoints :
```
GET    /api/v1/auth/sessions      → liste mes sessions actives
DELETE /api/v1/auth/sessions/:id  → révoquer un équipement
DELETE /api/v1/auth/sessions      → révoquer toutes sauf la courante
```

---

## 4. GED — Stockage de fichiers

### Principe

Le bucket S3 est **privé**. Les fichiers ne sont jamais exposés publiquement. L'API génère des URLs signées éphémères (15 min) à la demande.

### Flux d'upload

```
Client → POST /api/v1/dossiers/:id/documents (multipart)
       → API valide (type, taille) + upload stream vers S3
       → API sauve métadonnées en DB
       → API retourne { id, nom, type_doc }

Client → GET /api/v1/documents/:id/url
       → API génère URL signée (15 min)
       → Client télécharge directement depuis S3
```

### Organisation du bucket

```
bucket/
└── dossiers/
    └── {année}/
        └── {reference_dossier}/
            └── {type_doc}/
                └── {uuid}_{nom_original}
```

### Contraintes

- Taille max : **20 Mo** par fichier
- Types autorisés : `pdf`, `jpg`, `png`, `xlsx`, `docx`
- Portabilité : MinIO (dev / VPS), Cloudflare R2 ou AWS S3 (cloud) — même API S3, zéro changement de code

```ts
// lib/storage.ts
export const storage = new S3Client({
  endpoint:    process.env.S3_ENDPOINT,
  region:      process.env.S3_REGION,
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
})
```

---

## 5. Audit Trail

### Principes

- Table `audit_log` **append-only** — aucune ligne modifiée ou supprimée
- Écriture au niveau service, dans la **même transaction** que l'action
- Payload JSONB avec diff `{ before?, after?, meta? }`
- Index sur `(entity_type, entity_id, created_at DESC)` pour requêtes rapides

### Actions tracées

**Dossiers**

| Action | Déclencheur |
|--------|-------------|
| `DOSSIER_CREATED` | Création |
| `DOSSIER_UPDATED` | Modification |
| `DOSSIER_STATUS_CHANGED` | Changement de statut |
| `DOSSIER_ASSIGNED` | Réassignation à un agent |
| `DOCUMENT_UPLOADED` | Upload d'un document |
| `DOCUMENT_DELETED` | Suppression d'un document |

**Clients**

| Action | Déclencheur |
|--------|-------------|
| `CLIENT_CREATED` | Création |
| `CLIENT_UPDATED` | Modification |
| `CLIENT_DELETED` | Suppression |

**Utilisateurs**

| Action | Déclencheur |
|--------|-------------|
| `USER_CREATED` | Création d'un compte |
| `USER_UPDATED` | Modification du profil |
| `USER_DEACTIVATED` | Désactivation |
| `USER_REACTIVATED` | Réactivation |
| `USER_ROLE_CHANGED` | Changement de rôle |
| `USER_PASSWORD_CHANGED` | Changement de mot de passe |
| `USER_LOGIN` | Connexion réussie |
| `USER_LOGIN_FAILED` | Tentative échouée (protection brute force) |
| `USER_LOGOUT` | Déconnexion |
| `SESSION_REVOKED` | Session / équipement révoqué |

### Helper service

```ts
// services/audit.service.ts
export async function logAction(
  tx:         DrizzleTransaction,
  action:     AuditAction,
  entityType: AuditEntityType,
  entityId:   string | null,
  user:       AuthUser | null,
  payload?:   object,
) {
  await tx.insert(auditLog).values({
    action, entityType, entityId,
    userId:    user?.id ?? null,
    ip:        user?.ip ?? null,
    userAgent: user?.userAgent ?? null,
    payload,
  })
}
```

### Endpoint AuditTimeline

```
GET /api/v1/dossiers/:id/audit
→ { data: AuditEntry[], meta: { total } }
```

Retourne les entrées triées par `created_at DESC`, consommées par le composant `AuditTimeline` existant dans le frontend.

---

## Récapitulatif des décisions clés

| Décision | Choix | Raison |
|----------|-------|--------|
| Architecture | Monorepo Bun workspaces | Portabilité cloud/VPS, types partagés |
| API | Hono sur Bun | Léger, cohérent avec le stack, extensible |
| ORM | Drizzle | Type-safe, performant, compatible Bun |
| Auth | Better Auth + RBAC plugin | Évite le code custom, sessions sécurisées |
| Stockage | S3-compatible | MinIO en dev, R2/S3 en prod sans changement de code |
| Audit | Append-only, même transaction | Cohérence garantie, traçabilité complète |
| Régimes | Table de référence seedée | Flexible, pas d'enum figé dans le code |
