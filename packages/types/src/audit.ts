export type AuditEntityType = 'DOSSIER' | 'DOCUMENT' | 'CLIENT' | 'USER' | 'SESSION'

export type AuditAction =
  | 'DOSSIER_CREATED' | 'DOSSIER_UPDATED' | 'DOSSIER_STATUS_CHANGED' | 'DOSSIER_ASSIGNED'
  | 'DOCUMENT_UPLOADED' | 'DOCUMENT_DELETED'
  | 'CLIENT_CREATED' | 'CLIENT_UPDATED' | 'CLIENT_DELETED'
  | 'USER_CREATED' | 'USER_UPDATED' | 'USER_DEACTIVATED' | 'USER_REACTIVATED'
  | 'USER_ROLE_CHANGED' | 'USER_PASSWORD_CHANGED'
  | 'USER_LOGIN' | 'USER_LOGIN_FAILED' | 'USER_LOGOUT'
  | 'SESSION_REVOKED'

export interface AuditEntry {
  id:         string
  entityType: AuditEntityType
  entityId:   string | null
  action:     AuditAction
  userId:     string | null
  payload:    Record<string, unknown> | null
  ip:         string | null
  userAgent:  string | null
  createdAt:  string
}
