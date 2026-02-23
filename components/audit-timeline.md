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
| `groupByDate` | `boolean` | `false` | Groups events under date section headers (sticky when inside a scroll container) |
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
- Date group headers have `aria-hidden="true"`
- Metadata expand button has `aria-expanded` and `aria-controls`
- Sentinel div is `aria-hidden="true"`; loading state announced via `role="status"` sr-only span
- Spinner has `motion-reduce:animate-none`
