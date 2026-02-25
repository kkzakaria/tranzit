export type UserRole = 'admin' | 'responsable' | 'agent' | 'superviseur'

export type ClientType = 'IMPORTATEUR' | 'EXPORTATEUR' | 'LES_DEUX'

export interface Client {
  id:        string
  nom:       string
  type:      ClientType
  rc:        string | null
  nif:       string | null
  contact:   string | null
  createdAt: string
  updatedAt: string
}
