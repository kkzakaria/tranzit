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
