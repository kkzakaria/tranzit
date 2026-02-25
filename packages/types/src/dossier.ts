export type DossierType = 'IMPORT' | 'EXPORT' | 'TRANSIT' | 'ADMISSION_TEMPORAIRE'

export type DossierStatutTerminal = 'CLOTURE' | 'REJETE'
export type DossierStatut =
  | DossierStatutTerminal
  | 'BROUILLON'
  | 'DEPOSE'
  | 'EN_COURS'
  | 'EN_ATTENTE'
  | 'DEDOUANE'

// Tableau runtime — permet la validation sans redéclarer l'union
export const TYPE_DOC_VALUES = [
  'FACTURE',
  'CONNAISSEMENT',
  'CERTIFICAT_ORIGINE',
  'LISTE_COLISAGE',
  'DECLARATION',
  'LICENCE',
  'BON_COMMANDE',
  'AUTRE',
] as const

export type TypeDoc = typeof TYPE_DOC_VALUES[number]

// Constante partagée frontend/backend — évite la duplication du magic number 20 Mo
export const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024

export interface Dossier {
  id:         string
  reference:  string
  type:       DossierType
  statut:     DossierStatut
  regimeId:   string
  clientId:   string
  agentId:    string
  serviceId:  string
  createdAt:  string
  updatedAt:  string
}

// Renommé depuis `Document` pour éviter la collision avec le global DOM Document
export interface DossierDocument {
  id:          string
  dossierId:   string
  nom:         string
  typeDoc:     TypeDoc
  taille:      number
  uploadedBy:  string
  createdAt:   string
  // storageKey est interne — utiliser GET /documents/:id/url pour télécharger
}
