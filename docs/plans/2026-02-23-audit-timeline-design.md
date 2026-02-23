# AuditTimeline — Design Document

Date: 2026-02-23

## Context

Reusable compound-style component that displays an immutable chronological audit trail of system/user actions. Complements `ProcessingStep` (which shows current workflow state) by showing the historical record of past events. Follows the same file structure conventions as existing compound components.

## Data Model

```ts
type AuditEventAction =
  | "create" | "update" | "delete"
  | "import" | "export"
  | "approve" | "reject"
  | "login" | "logout"

type AuditEventStatus = "success" | "error" | "warning" | "info"

interface AuditEvent {
  id: string
  action: AuditEventAction
  status: AuditEventStatus
  timestamp: Date | string
  actor: { name: string; role?: string }
  message: string
  metadata?: Record<string, unknown>  // optional expandable details
}
```

## Architecture

**Approach: data-driven** — root component receives `events[]` + infinite scroll callbacks. Sentinel placement and IO are internal.

### Files

| File | Description |
|---|---|
| `components/audit-timeline.tsx` | `"use client"` component |
| `components/audit-timeline.md` | Documentation & usage |
| `hooks/use-audit-timeline.ts` | Context + `useAuditTimeline` hook |
| `app/[locale]/demo/audit-timeline/page.tsx` | RSC shell with `generateMetadata` |
| `app/[locale]/demo/audit-timeline/_demo.tsx` | `"use client"` interactive demo |
| `components/app-sidebar.tsx` | Add sidebar entry |
| `messages/*/navigation.json` | Add `auditTimeline` i18n key (fr, en, ar, zh) |

### Props — `AuditTimeline`

| Prop | Type | Default | Description |
|---|---|---|---|
| `events` | `AuditEvent[]` | required | Events to display |
| `onLoadMore` | `() => void` | — | Called when sentinel enters viewport |
| `hasMore` | `boolean` | `false` | Hides sentinel when false |
| `loading` | `boolean` | `false` | Shows loading spinner in sentinel |
| `groupByDate` | `boolean` | `false` | Groups events by day with sticky date headers |
| `className` | `string` | — | Additional CSS classes on root `<ol>` |
| `aria-label` | `string` | `"Historique d'audit"` | Accessible label |

## Visual Design

### Layout (vertical timeline)

```
┌─────────────────────────────────────────────┐
│                                             │
│  ● ──── [Import] · Système · il y a 5 min  │ ← success dot (green)
│  │       Fichier client_2024.csv importé    │
│  │       [Voir les détails ▼]              │
│  │       ┌──────────────────────────────┐  │
│  │       │ { "rows": 1240, ... }        │  │
│  │       └──────────────────────────────┘  │
│  │                                         │
│  ● ──── [Validation] · Alice · il y a 3 min│ ← error dot (red)
│  │       Échec : 3 champs invalides         │
│  │                                         │
│  ···  [chargement]  ← IO sentinel           │
└─────────────────────────────────────────────┘
```

### Item anatomy

1. **Dot**: colored circle (`size-2.5`) on the vertical line, color = status
2. **Header row**: action badge + actor name + relative timestamp (`<time datetime>`)
3. **Message**: text below header
4. **Expand** (optional): `<details>/<summary>` "Voir les détails" → `<pre>` JSON block

### Status → dot color mapping

| Status | Dot class | Badge class |
|---|---|---|
| `success` | `bg-green-600` | `bg-green-600/10 text-green-700` |
| `error` | `bg-destructive` | `bg-destructive/10 text-destructive` |
| `warning` | `bg-yellow-500` | `bg-yellow-500/10 text-yellow-700` |
| `info` | `bg-primary` | `bg-primary/10 text-primary` |

### Action badge labels (French)

| Action | Label |
|---|---|
| `create` | Création |
| `update` | Modification |
| `delete` | Suppression |
| `import` | Import |
| `export` | Export |
| `approve` | Approbation |
| `reject` | Rejet |
| `login` | Connexion |
| `logout` | Déconnexion |

### Timestamp

- Rendered as `<time datetime={isoString}>{relativeLabel}</time>`
- Relative label computed client-side in a `useEffect` to avoid hydration mismatch
- Fallback: ISO string on SSR

### Expandable metadata

- `<details>/<summary>` native HTML — no animation dependency
- Content: `<pre className="text-xs overflow-auto">{JSON.stringify(metadata, null, 2)}</pre>`
- Only rendered when `metadata` is non-empty

## Infinite Scroll

- An `IntersectionObserver` watches a sentinel `<div>` at the bottom of the list
- Sentinel is rendered only when `hasMore === true`
- When sentinel enters viewport: calls `onLoadMore()`
- `loading === true`: sentinel shows a spinner instead of nothing
- IO cleanup on unmount

## Grouping by date (`groupByDate`)

When enabled, events are grouped by calendar day (computed from `timestamp`). Each group is preceded by a `<li>` date header styled as a sticky label (e.g. "Aujourd'hui", "Hier", "12 février 2026").

## Accessibility

- Root renders as `<ol>` with `aria-label`
- Each event item is a `<li>`
- Dot + connector line: `aria-hidden="true"`
- Action icon (if added): `aria-hidden="true"` with label from badge text
- `<details>/<summary>` has native keyboard support

## Demo Page

Interactive demo at `/demo/audit-timeline` with:
- 20 mock events loaded initially
- "Charger plus" via simulated async (setTimeout)
- Toggle for `groupByDate`
- Filter by status (radio buttons) — controlled by parent, not component

## Sidebar

Add entry after `processingStep`:
- href: `/demo/audit-timeline`
- icon: `TimeScheduleIcon` or `ListViewIcon`
- translation key: `auditTimeline`
