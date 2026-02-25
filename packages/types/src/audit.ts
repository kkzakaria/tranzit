// Discriminated union — empêche les pairings invalides action/entityType au compile time
export type AuditEvent =
  | { entityType: 'DOSSIER';  action: 'DOSSIER_CREATED' | 'DOSSIER_UPDATED' | 'DOSSIER_STATUS_CHANGED' | 'DOSSIER_ASSIGNED' }
  | { entityType: 'DOCUMENT'; action: 'DOCUMENT_UPLOADED' | 'DOCUMENT_DELETED' }
  | { entityType: 'CLIENT';   action: 'CLIENT_CREATED' | 'CLIENT_UPDATED' | 'CLIENT_DELETED' }
  | { entityType: 'USER';     action: 'USER_CREATED' | 'USER_UPDATED' | 'USER_DEACTIVATED' | 'USER_REACTIVATED' | 'USER_ROLE_CHANGED' | 'USER_PASSWORD_CHANGED' | 'USER_LOGIN' | 'USER_LOGIN_FAILED' | 'USER_LOGOUT' }
  | { entityType: 'SESSION';  action: 'SESSION_REVOKED' }

// Dérivés pour compatibilité DB enum
export type AuditEntityType = AuditEvent['entityType']
export type AuditAction     = AuditEvent['action']

export interface AuditEntry {
  readonly id:         string
  readonly entityType: AuditEntityType
  readonly entityId:   string | null
  readonly action:     AuditAction
  readonly userId:     string | null
  readonly payload:    Record<string, unknown> | null
  readonly ip:         string | null
  readonly userAgent:  string | null
  readonly createdAt:  string
}
