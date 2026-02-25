import type { AuditAction, AuditEntityType } from '@tranzit/types'
import { auditLog } from '../db/schema'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTx = any

export interface AuditUser {
  id:        string
  ip:        string
  userAgent: string
}

export async function logAction(
  tx:         AnyTx,
  action:     AuditAction,
  entityType: AuditEntityType,
  entityId:   string | null,
  user:       AuditUser | null,
  payload?:   Record<string, unknown>,
): Promise<void> {
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
