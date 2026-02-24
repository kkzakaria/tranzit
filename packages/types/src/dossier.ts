export type DossierType = 'IMPORT' | 'EXPORT' | 'TRANSIT' | 'ADMISSION_TEMPORAIRE'

export type DossierStatut =
  | 'BROUILLON'
  | 'DEPOSE'
  | 'EN_COURS'
  | 'EN_ATTENTE'
  | 'DEDOUANE'
  | 'CLOTURE'
  | 'REJETE'

export type TypeDoc =
  | 'FACTURE'
  | 'CONNAISSEMENT'
  | 'CERTIFICAT_ORIGINE'
  | 'LISTE_COLISAGE'
  | 'DECLARATION'
  | 'LICENCE'
  | 'BON_COMMANDE'
  | 'AUTRE'

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

export interface Document {
  id:          string
  dossierId:   string
  nom:         string
  typeDoc:     TypeDoc
  storageKey:  string
  taille:      number
  uploadedBy:  string
  createdAt:   string
}
