// Documentation & usage examples: ./audit-timeline.md

"use client"

import { type ComponentProps, Fragment, useEffect, useId, useMemo, useRef, useState } from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { Loading03Icon } from "@hugeicons/core-free-icons"

import { cn } from "@/lib/utils"
import type { AuditEvent, AuditEventAction, AuditEventStatus } from "@/hooks/use-audit-timeline"

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

function formatRelativeTime(timestamp: Date | string): string {
  const ms = new Date(timestamp).getTime()
  if (Number.isNaN(ms)) return "date invalide"
  const diff = Date.now() - ms
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
    const bucket = map.get(key) ?? []
    bucket.push(event)
    map.set(key, bucket)
  }
  return Array.from(map.entries()).map(([, evts]) => ({
    dateLabel: formatDateHeader(evts[0].timestamp),
    events: evts,
  }))
}

function formatMetadata(metadata: Record<string, unknown>): string {
  try {
    return JSON.stringify(metadata, null, 2)
  } catch {
    return "[Impossible d'afficher les métadonnées : format non sérialisable]"
  }
}

function AuditTimelineItem({
  event,
  isLast,
}: {
  event: AuditEvent
  isLast: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const relTime = formatRelativeTime(event.timestamp)

  return (
    <li data-slot="audit-timeline-item" className="flex gap-3">
      {/* Left column: dot + connector */}
      <div className="flex flex-col items-center shrink-0" aria-hidden="true">
        <div
          className={cn(
            "size-2.5 rounded-full mt-1.5 shrink-0 ring-2 ring-background",
            STATUS_DOT[event.status] ?? "bg-muted"
          )}
        />
        {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
      </div>

      {/* Content */}
      <div className={cn("flex-1 min-w-0 pb-6", isLast && "pb-0")}>
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <span
            className={cn(
              "text-xs font-medium px-2 py-0.5 rounded-full shrink-0",
              STATUS_BADGE[event.status] ?? "bg-muted text-muted-foreground"
            )}
          >
            {ACTION_LABELS[event.action] ?? event.action}
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
            suppressHydrationWarning
          >
            {relTime}
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
              aria-controls={expanded ? detailsId : undefined}
            >
              {expanded ? "Masquer les détails" : "Voir les détails"}
            </button>
            {expanded && (
              <pre id={detailsId} className="mt-2 text-xs bg-muted rounded-md p-3 overflow-auto max-h-48 font-mono">
                {formatMetadata(event.metadata)}
              </pre>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function DateGroupHeader({ label }: { label: string }) {
  return (
    <li
      role="separator"
      data-slot="audit-timeline-date-header"
      className="sticky top-0 z-10 flex items-center gap-3 bg-background py-2"
      aria-label={label}
    >
      <div className="w-2.5 shrink-0" aria-hidden="true" />
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide" aria-hidden="true">
        {label}
      </span>
    </li>
  )
}

export interface AuditTimelineProps extends ComponentProps<"div"> {
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
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!onLoadMore || !hasMore || loading) return
    if (typeof IntersectionObserver !== "function") return
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
  }, [onLoadMore, hasMore, loading])

  const grouped = useMemo(
    () => (groupByDate ? groupEventsByDate(events) : null),
    [events, groupByDate]
  )

  return (
    <div
      data-slot="audit-timeline"
      className={cn("relative", className)}
      {...props}
    >
      <ol aria-label={ariaLabel}>
        {grouped
          ? grouped.map(({ dateLabel, events: group }, groupIdx) => (
              <Fragment key={dateLabel}>
                <DateGroupHeader label={dateLabel} />
                {group.map((event, idx) => (
                  <AuditTimelineItem
                    key={event.id}
                    event={event}
                    isLast={!hasMore && groupIdx === grouped.length - 1 && idx === group.length - 1}
                  />
                ))}
              </Fragment>
            ))
          : events.map((event, idx) => (
              <AuditTimelineItem
                key={event.id}
                event={event}
                isLast={!hasMore && idx === events.length - 1}
              />
            ))}
      </ol>

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <>
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
          {loading && (
            <span role="status" className="sr-only">
              Chargement en cours…
            </span>
          )}
        </>
      )}
    </div>
  )
}

export type { AuditEvent, AuditEventAction, AuditEventStatus } from "@/hooks/use-audit-timeline"
