# AuditTimeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reusable `AuditTimeline` compound component that renders a vertical, chronological audit trail with infinite scroll, expandable metadata, and optional date grouping.

**Architecture:** Data-driven root component (`events[]` + `onLoadMore` callback) renders items internally; an `IntersectionObserver` watches a sentinel `<div>` at the bottom to trigger pagination. Each event item has a colored status dot, action badge, actor/timestamp header, message, and a `<details>`-based metadata expander.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, `cn()` utility, Hugeicons (for loading spinner only), IntersectionObserver API.

---

### Task 1: Types + context hook

**Files:**
- Create: `hooks/use-audit-timeline.ts`

**Step 1: Create the hook/types file**

```ts
// hooks/use-audit-timeline.ts
"use client"

export type AuditEventAction =
  | "create"
  | "update"
  | "delete"
  | "import"
  | "export"
  | "approve"
  | "reject"
  | "login"
  | "logout"

export type AuditEventStatus = "success" | "error" | "warning" | "info"

export interface AuditEvent {
  id: string
  action: AuditEventAction
  status: AuditEventStatus
  timestamp: Date | string
  actor: { name: string; role?: string }
  message: string
  metadata?: Record<string, unknown>
}
```

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add hooks/use-audit-timeline.ts
git commit -m "feat: add AuditEvent types to use-audit-timeline hook"
```

---

### Task 2: Core component

**Files:**
- Create: `components/audit-timeline.tsx`

**Step 1: Create the component**

```tsx
// components/audit-timeline.tsx
// Documentation & usage examples: ./audit-timeline.md

"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import type { AuditEvent, AuditEventAction, AuditEventStatus } from "@/hooks/use-audit-timeline"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<AuditEventAction, string> = {
  create: "Création",
  update: "Modification",
  delete: "Suppression",
  import: "Import",
  export: "Export",
  approve: "Approbation",
  reject: "Rejet",
  login: "Connexion",
  logout: "Déconnexion",
}

const STATUS_DOT: Record<AuditEventStatus, string> = {
  success: "bg-green-600",
  error: "bg-destructive",
  warning: "bg-yellow-500",
  info: "bg-primary",
}

const STATUS_BADGE: Record<AuditEventStatus, string> = {
  success: "bg-green-600/10 text-green-700",
  error: "bg-destructive/10 text-destructive",
  warning: "bg-yellow-500/10 text-yellow-700",
  info: "bg-primary/10 text-primary",
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(timestamp: Date | string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  if (diff < 60_000) return "il y a quelques secondes"
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`
  return `il y a ${Math.floor(diff / 86_400_000)} j`
}

function formatDateHeader(timestamp: Date | string): string {
  const date = new Date(timestamp)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (date.toDateString() === yesterday.toDateString()) return "Hier"
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function groupEventsByDate(
  events: AuditEvent[]
): Array<{ dateLabel: string; events: AuditEvent[] }> {
  const map = new Map<string, AuditEvent[]>()
  for (const event of events) {
    const key = new Date(event.timestamp).toDateString()
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(event)
  }
  return Array.from(map.entries()).map(([, evts]) => ({
    dateLabel: formatDateHeader(evts[0].timestamp),
    events: evts,
  }))
}

// ---------------------------------------------------------------------------
// AuditTimelineItem (internal)
// ---------------------------------------------------------------------------

function AuditTimelineItem({
  event,
  isLast,
}: {
  event: AuditEvent
  isLast: boolean
}) {
  const [relTime, setRelTime] = React.useState<string>("")
  const [expanded, setExpanded] = React.useState(false)

  React.useEffect(() => {
    setRelTime(formatRelativeTime(event.timestamp))
  }, [event.timestamp])

  return (
    <li data-slot="audit-timeline-item" className="flex gap-3">
      {/* Left column: dot + connector */}
      <div className="flex flex-col items-center shrink-0" aria-hidden="true">
        <div
          className={cn(
            "size-2.5 rounded-full mt-1.5 shrink-0 ring-2 ring-background",
            STATUS_DOT[event.status]
          )}
        />
        {!isLast && <div className="w-px flex-1 bg-border mt-1 mb-0" />}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0 pb-6", isLast && "pb-0")}>
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
              STATUS_BADGE[event.status]
            )}
          >
            {ACTION_LABELS[event.action]}
          </span>
          <span className="text-sm font-medium truncate">{event.actor.name}</span>
          {event.actor.role && (
            <span className="text-xs text-muted-foreground shrink-0">
              ({event.actor.role})
            </span>
          )}
          <time
            dateTime={new Date(event.timestamp).toISOString()}
            className="text-xs text-muted-foreground ml-auto shrink-0"
          >
            {relTime || new Date(event.timestamp).toLocaleString("fr-FR")}
          </time>
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground">{event.message}</p>

        {/* Expandable metadata */}
        {event.metadata && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
              aria-expanded={expanded}
            >
              {expanded ? "Masquer les détails" : "Voir les détails"}
            </button>
            {expanded && (
              <pre className="mt-2 text-xs bg-muted rounded-md p-3 overflow-auto max-h-48 font-mono">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// DateGroupHeader (internal)
// ---------------------------------------------------------------------------

function DateGroupHeader({ label }: { label: string }) {
  return (
    <li
      data-slot="audit-timeline-date-header"
      className="flex items-center gap-3 py-2"
      aria-hidden="true"
    >
      <div className="w-2.5 shrink-0" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
    </li>
  )
}

// ---------------------------------------------------------------------------
// AuditTimeline (root)
// ---------------------------------------------------------------------------

export interface AuditTimelineProps extends React.ComponentProps<"div"> {
  events: AuditEvent[]
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
  groupByDate?: boolean
  "aria-label"?: string
}

export function AuditTimeline({
  events,
  onLoadMore,
  hasMore = false,
  loading = false,
  groupByDate = false,
  className,
  "aria-label": ariaLabel = "Historique d'audit",
  ...props
}: AuditTimelineProps) {
  const sentinelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!onLoadMore || !hasMore) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore()
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [onLoadMore, hasMore])

  const renderItems = (items: AuditEvent[], baseIndex: number, totalLength: number) =>
    items.map((event, idx) => (
      <AuditTimelineItem
        key={event.id}
        event={event}
        isLast={!hasMore && baseIndex + idx === totalLength - 1}
      />
    ))

  const grouped = groupByDate ? groupEventsByDate(events) : null

  return (
    <div
      data-slot="audit-timeline"
      className={cn("relative", className)}
      {...props}
    >
      <ol aria-label={ariaLabel}>
        {grouped
          ? grouped.map(({ dateLabel, events: group }, groupIdx) => {
              const baseIndex = grouped
                .slice(0, groupIdx)
                .reduce((acc, g) => acc + g.events.length, 0)
              return (
                <React.Fragment key={dateLabel}>
                  <DateGroupHeader label={dateLabel} />
                  {renderItems(group, baseIndex, events.length)}
                </React.Fragment>
              )
            })
          : renderItems(events, 0, events.length)}
      </ol>

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div
          ref={sentinelRef}
          aria-hidden="true"
          className="flex justify-center py-4"
        >
          {loading && (
            <HugeiconsIcon
              icon={Loading03Icon}
              className="size-5 animate-spin text-muted-foreground motion-reduce:animate-none"
            />
          )}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add components/audit-timeline.tsx
git commit -m "feat: add AuditTimeline component with infinite scroll and date grouping"
```

---

### Task 3: Documentation

**Files:**
- Create: `components/audit-timeline.md`

**Step 1: Create the doc file**

```markdown
# AuditTimeline

Vertical chronological audit trail component. Displays a list of past events with status dots, action badges, actor/timestamp headers, messages, and expandable metadata. Supports infinite scroll via IntersectionObserver.

> **Client component:** `audit-timeline.tsx` is marked `"use client"`. Render it inside a Client Component subtree.

## Usage

### Basic

```tsx
import { AuditTimeline } from "@/components/audit-timeline"
import type { AuditEvent } from "@/hooks/use-audit-timeline"

const events: AuditEvent[] = [
  {
    id: "1",
    action: "import",
    status: "success",
    timestamp: new Date(),
    actor: { name: "Système" },
    message: "Fichier importé avec succès.",
    metadata: { rows: 1240, size: "2.4 MB" },
  },
]

<AuditTimeline events={events} />
```

### With infinite scroll

```tsx
<AuditTimeline
  events={events}
  hasMore={hasMore}
  loading={isLoading}
  onLoadMore={fetchNextPage}
/>
```

### Grouped by date

```tsx
<AuditTimeline events={events} groupByDate />
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `events` | `AuditEvent[]` | required | Events to display (chronological order, most recent last) |
| `onLoadMore` | `() => void` | — | Called when the scroll sentinel enters the viewport |
| `hasMore` | `boolean` | `false` | Renders the sentinel; hides it when false |
| `loading` | `boolean` | `false` | Shows a spinner inside the sentinel |
| `groupByDate` | `boolean` | `false` | Groups events under sticky date headers |
| `aria-label` | `string` | `"Historique d'audit"` | Accessible label for the `<ol>` |
| `className` | `string` | — | Extra CSS classes on the root `<div>` |

## AuditEvent

```ts
interface AuditEvent {
  id: string
  action: AuditEventAction   // "create" | "update" | "delete" | "import" | "export" | "approve" | "reject" | "login" | "logout"
  status: AuditEventStatus   // "success" | "error" | "warning" | "info"
  timestamp: Date | string
  actor: { name: string; role?: string }
  message: string
  metadata?: Record<string, unknown>  // shown in expandable JSON block
}
```

## Status → visual

| Status | Dot | Badge |
|---|---|---|
| `success` | `bg-green-600` | green |
| `error` | `bg-destructive` | red |
| `warning` | `bg-yellow-500` | yellow |
| `info` | `bg-primary` | primary |

## Exports

| Export | Kind |
|---|---|
| `AuditTimeline` | Component |
| `AuditTimelineProps` | Type |
| `AuditEvent` | Type (from `hooks/use-audit-timeline`) |
| `AuditEventAction` | Type (from `hooks/use-audit-timeline`) |
| `AuditEventStatus` | Type (from `hooks/use-audit-timeline`) |

## Accessibility

- Root renders as `<div>` containing an `<ol aria-label>`
- Each event is an `<li>`
- Dots and connectors are `aria-hidden="true"`
- Metadata expand button has `aria-expanded`
- Sentinel div is `aria-hidden="true"`
- Spinner has `motion-reduce:animate-none`
```

**Step 2: Commit**

```bash
git add components/audit-timeline.md
git commit -m "docs: add AuditTimeline component documentation"
```

---

### Task 4: i18n — navigation keys

**Files:**
- Modify: `messages/fr/navigation.json`
- Modify: `messages/en/navigation.json`
- Modify: `messages/ar/navigation.json`
- Modify: `messages/zh/navigation.json`

**Step 1: Add `auditTimeline` key to all four files**

`messages/fr/navigation.json` — add after `"processingStep"`:
```json
"auditTimeline": "Historique d'audit"
```

`messages/en/navigation.json` — add after `"processingStep"`:
```json
"auditTimeline": "Audit Timeline"
```

`messages/ar/navigation.json` — add after `"processingStep"`:
```json
"auditTimeline": "سجل التدقيق"
```

`messages/zh/navigation.json` — add after `"processingStep"`:
```json
"auditTimeline": "审计历史"
```

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add messages/fr/navigation.json messages/en/navigation.json messages/ar/navigation.json messages/zh/navigation.json
git commit -m "feat: add auditTimeline i18n navigation key"
```

---

### Task 5: Sidebar entry

**Files:**
- Modify: `components/app-sidebar.tsx`

**Step 1: Add import for sidebar icon**

In `components/app-sidebar.tsx`, add `ClockIcon` (or `TimeScheduleIcon`) to the hugeicons import list at the top. Use `ClockIcon` from `@hugeicons/core-free-icons`:

```ts
import {
  // existing imports...
  ClockIcon,
} from "@hugeicons/core-free-icons"
```

**Step 2: Add sidebar item**

After the `processingStep` `SidebarItem`, add:

```tsx
<SidebarItem
  href="/demo/audit-timeline"
  icon={ClockIcon}
  active={pathname === "/demo/audit-timeline"}
  className={activeItemClass}
>
  {t("auditTimeline")}
</SidebarItem>
```

**Step 3: Verify build**

Run: `bun run build`
Expected: build succeeds with no errors

**Step 4: Commit**

```bash
git add components/app-sidebar.tsx
git commit -m "feat: add Audit Timeline entry to sidebar"
```

---

### Task 6: Demo page — RSC shell

**Files:**
- Create: `app/[locale]/demo/audit-timeline/page.tsx`

**Step 1: Create the RSC shell**

```tsx
// app/[locale]/demo/audit-timeline/page.tsx
import type { Metadata } from "next"

import { AuditTimelineDemo } from "./_demo"

export const metadata: Metadata = {
  title: "Historique d'audit — Tranzit",
}

export default function AuditTimelineDemoPage() {
  return <AuditTimelineDemo />
}
```

**Step 2: Commit**

```bash
git add "app/[locale]/demo/audit-timeline/page.tsx"
git commit -m "feat: add audit-timeline demo RSC shell"
```

---

### Task 7: Demo interactive component

**Files:**
- Create: `app/[locale]/demo/audit-timeline/_demo.tsx`

**Step 1: Create mock data + demo**

```tsx
// app/[locale]/demo/audit-timeline/_demo.tsx
"use client"

import { useState, useCallback } from "react"
import { AuditTimeline } from "@/components/audit-timeline"
import type { AuditEvent } from "@/hooks/use-audit-timeline"

// ---------------------------------------------------------------------------
// Mock data (30 events, most recent first in the array but displayed oldest-first)
// ---------------------------------------------------------------------------

const now = Date.now()
const min = 60_000
const hr = 3_600_000
const day = 86_400_000

const ALL_EVENTS: AuditEvent[] = [
  {
    id: "1",
    action: "login",
    status: "success",
    timestamp: new Date(now - 5 * min),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Connexion réussie depuis 192.168.1.42.",
    metadata: { ip: "192.168.1.42", browser: "Chrome 121", os: "macOS" },
  },
  {
    id: "2",
    action: "import",
    status: "success",
    timestamp: new Date(now - 8 * min),
    actor: { name: "Système" },
    message: "Fichier client_2024.csv importé avec succès.",
    metadata: { rows: 1240, size: "2.4 MB", format: "CSV" },
  },
  {
    id: "3",
    action: "update",
    status: "error",
    timestamp: new Date(now - 15 * min),
    actor: { name: "Bob Dupont", role: "Opérateur" },
    message: "Échec de la mise à jour : contrainte de clé étrangère violée.",
    metadata: { table: "clients", field: "region_id", value: 999 },
  },
  {
    id: "4",
    action: "approve",
    status: "success",
    timestamp: new Date(now - 30 * min),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Demande #4821 approuvée.",
  },
  {
    id: "5",
    action: "create",
    status: "success",
    timestamp: new Date(now - 45 * min),
    actor: { name: "Bob Dupont", role: "Opérateur" },
    message: "Nouveau projet « Migration Q1 » créé.",
    metadata: { projectId: "proj_4821", type: "migration" },
  },
  {
    id: "6",
    action: "delete",
    status: "warning",
    timestamp: new Date(now - 2 * hr),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Archive de janvier 2023 supprimée (soft delete).",
    metadata: { archiveId: "arch_2301", retentionDays: 90 },
  },
  {
    id: "7",
    action: "export",
    status: "success",
    timestamp: new Date(now - 3 * hr),
    actor: { name: "Système" },
    message: "Rapport mensuel exporté en PDF.",
    metadata: { size: "1.1 MB", pages: 24 },
  },
  {
    id: "8",
    action: "reject",
    status: "error",
    timestamp: new Date(now - 4 * hr),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Demande #4815 rejetée : données incomplètes.",
  },
  {
    id: "9",
    action: "update",
    status: "info",
    timestamp: new Date(now - 6 * hr),
    actor: { name: "Système" },
    message: "Mise à jour automatique des taux de change.",
    metadata: { currencies: ["EUR", "USD", "GBP"], source: "ECB" },
  },
  {
    id: "10",
    action: "login",
    status: "success",
    timestamp: new Date(now - 8 * hr),
    actor: { name: "Carol Lee", role: "Lecteur" },
    message: "Connexion réussie.",
  },
  {
    id: "11",
    action: "import",
    status: "error",
    timestamp: new Date(now - 1 * day - 1 * hr),
    actor: { name: "Bob Dupont", role: "Opérateur" },
    message: "Import échoué : format de fichier non supporté.",
    metadata: { filename: "rapport.xlsx", expectedFormat: "CSV" },
  },
  {
    id: "12",
    action: "create",
    status: "success",
    timestamp: new Date(now - 1 * day - 3 * hr),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Nouvel utilisateur « carol.lee » créé.",
    metadata: { role: "Lecteur", email: "carol@example.com" },
  },
  {
    id: "13",
    action: "approve",
    status: "success",
    timestamp: new Date(now - 1 * day - 5 * hr),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Demande #4800 approuvée.",
  },
  {
    id: "14",
    action: "logout",
    status: "info",
    timestamp: new Date(now - 1 * day - 6 * hr),
    actor: { name: "Bob Dupont", role: "Opérateur" },
    message: "Déconnexion.",
  },
  {
    id: "15",
    action: "export",
    status: "warning",
    timestamp: new Date(now - 2 * day - 2 * hr),
    actor: { name: "Système" },
    message: "Export partiel : 3 lignes ignorées (valeurs nulles).",
    metadata: { skippedRows: 3, totalRows: 1240 },
  },
  {
    id: "16",
    action: "update",
    status: "success",
    timestamp: new Date(now - 2 * day - 4 * hr),
    actor: { name: "Carol Lee", role: "Lecteur" },
    message: "Profil mis à jour.",
  },
  {
    id: "17",
    action: "delete",
    status: "error",
    timestamp: new Date(now - 2 * day - 6 * hr),
    actor: { name: "Bob Dupont", role: "Opérateur" },
    message: "Suppression refusée : enregistrement verrouillé.",
    metadata: { recordId: "rec_7712", lockedBy: "alice.martin" },
  },
  {
    id: "18",
    action: "import",
    status: "success",
    timestamp: new Date(now - 3 * day - 1 * hr),
    actor: { name: "Système" },
    message: "Import planifié terminé avec succès.",
    metadata: { rows: 870, duration: "4.2s" },
  },
  {
    id: "19",
    action: "create",
    status: "success",
    timestamp: new Date(now - 3 * day - 3 * hr),
    actor: { name: "Alice Martin", role: "Admin" },
    message: "Nouveau projet « Audit Q4 » créé.",
  },
  {
    id: "20",
    action: "login",
    status: "error",
    timestamp: new Date(now - 3 * day - 5 * hr),
    actor: { name: "Inconnu" },
    message: "Tentative de connexion échouée (mot de passe incorrect).",
    metadata: { ip: "203.0.113.42", attempts: 3 },
  },
]

// Events are stored most-recent-first for natural loading;
// display reverses them so oldest is at top, newest at bottom.
const PAGE_SIZE = 10

// ---------------------------------------------------------------------------
// AuditTimelineDemo
// ---------------------------------------------------------------------------

export function AuditTimelineDemo() {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loading, setLoading] = useState(false)
  const [groupByDate, setGroupByDate] = useState(false)

  // Display oldest first (reverse the slice)
  const visible = ALL_EVENTS.slice(0, visibleCount).reverse()
  const hasMore = visibleCount < ALL_EVENTS.length

  const handleLoadMore = useCallback(() => {
    if (loading || !hasMore) return
    setLoading(true)
    setTimeout(() => {
      setVisibleCount((c) => Math.min(c + PAGE_SIZE, ALL_EVENTS.length))
      setLoading(false)
    }, 800)
  }, [loading, hasMore])

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-col p-6 md:p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Historique d&apos;audit
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Visualisez le journal d&apos;activité avec le composant{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
            AuditTimeline
          </code>
          .
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={groupByDate}
            onChange={(e) => setGroupByDate(e.target.checked)}
            className="size-4 accent-primary"
          />
          Grouper par date
        </label>
        <span className="text-xs text-muted-foreground ml-auto">
          {visible.length} / {ALL_EVENTS.length} événements
        </span>
      </div>

      {/* Timeline */}
      <div className="max-w-2xl">
        <AuditTimeline
          events={visible}
          onLoadMore={handleLoadMore}
          hasMore={hasMore}
          loading={loading}
          groupByDate={groupByDate}
        />
      </div>
    </div>
  )
}
```

**Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

**Step 3: Commit**

```bash
git add "app/[locale]/demo/audit-timeline/_demo.tsx"
git commit -m "feat: add AuditTimeline interactive demo"
```

---

### Task 8: Final build verification

**Step 1: Run full build**

Run: `bun run build`
Expected: build completes successfully, no TypeScript or ESLint errors

**Step 2: Lint check**

Run: `bun run lint`
Expected: no errors

**Step 3: Manual verification checklist**

Start dev server: `bun run dev`

- [ ] Navigate to `/demo/audit-timeline` — page loads
- [ ] Timeline shows 10 events, oldest at top
- [ ] Each event has correct dot color per status
- [ ] Action badge labels are in French
- [ ] Timestamp shows relative time (refreshes client-side, no hydration error)
- [ ] Click "Voir les détails" — JSON block appears; click again — hides
- [ ] Scroll to bottom — more events load automatically (spinner visible)
- [ ] After all 20 events loaded — sentinel disappears
- [ ] Toggle "Grouper par date" — date headers appear between days
- [ ] Sidebar entry "Historique d'audit" appears and links correctly
- [ ] No console errors
