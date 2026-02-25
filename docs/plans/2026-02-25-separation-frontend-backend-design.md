# Design — Séparation Frontend / Backend

**Date :** 2026-02-25
**Statut :** Approuvé

## Contexte

Le dépôt `tranzit` est un workspace bun hybride : la racine contient le frontend Next.js, `apps/api/` contient le backend Hono, et `packages/types/` expose des types partagés. L'objectif est de séparer ces deux parties en deux dépôts git indépendants avec un contrat de types auto-généré via OpenAPI.

## Structure cible

### `tranzit-api` (depuis `apps/api/`)

```
tranzit-api/
├── src/
│   ├── index.ts        point d'entrée OpenAPIHono
│   ├── routes/         routes définies avec zod-openapi
│   ├── db/             Drizzle + schémas
│   └── lib/            helpers (auth, s3, etc.)
├── drizzle/
├── drizzle.config.ts
├── package.json
└── tsconfig.json
```

### `tranzit-web` (depuis la racine, renommé)

```
tranzit-web/
├── app/                Next.js App Router (sans app/api/)
├── components/
├── hooks/
├── lib/
├── types/
│   └── api.ts          types auto-générés depuis le spec OpenAPI
├── package.json        (sans workspaces, sans apps/ ni packages/)
└── tsconfig.json
```

## Contrat OpenAPI

### Backend

- `@hono/zod-openapi` remplace `hono` pour la définition des routes
- Chaque route déclare ses schémas Zod (params, body, réponses)
- `GET /openapi.json` expose le spec généré automatiquement
- `GET /docs` expose une UI Scalar interactive (dev uniquement)

```ts
// src/index.ts
import { OpenAPIHono } from '@hono/zod-openapi'

const app = new OpenAPIHono()
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: { title: 'Tranzit API', version: '1.0.0' },
})
```

### Frontend

- `openapi-typescript` génère `types/api.ts` depuis le spec
- Script `gen:types` dans `package.json` :

```json
"gen:types": "openapi-typescript http://localhost:3001/openapi.json -o types/api.ts"
```

- Une seule commande resynchronise tous les types après modification du backend
- Les types ne sont jamais écrits à la main

## Stratégie de migration

### Étape 1 — Créer `tranzit-api`

1. Créer un nouveau repo GitHub `tranzit-api`
2. Copier le contenu de `apps/api/` comme racine du nouveau repo
3. Ajouter `@hono/zod-openapi` et `@scalar/hono-api-reference`
4. Migrer les routes `app/api/projects/...` depuis `tranzit` vers Hono
5. Vérifier que le backend tourne seul (`bun run dev`)

### Étape 2 — Nettoyer `tranzit` → `tranzit-web`

1. Renommer le repo GitHub `tranzit` → `tranzit-web`
2. Supprimer `apps/`, `packages/`, `app/api/`
3. Retirer `workspaces` du `package.json` racine, supprimer `@tranzit/types`
4. Ajouter `openapi-typescript` en dev dep + script `gen:types`
5. Générer `types/api.ts` depuis le backend local
6. Remplacer les imports `@tranzit/types` par les types générés

## Résultat attendu

- Deux dépôts indépendants, chacun avec son propre `bun.lock`
- Déploiements séparés et CI/CD indépendants
- Contrat de types toujours en sync via OpenAPI — aucune synchronisation manuelle
- Le frontend n'a plus de routes API Next.js
