import type { DossierStatut } from '@tranzit/types'
import { eq } from 'drizzle-orm'
import { dossiers } from '../db/schema'

const TRANSITIONS: Record<DossierStatut, DossierStatut[]> = {
  BROUILLON:  ['DEPOSE'],
  DEPOSE:     ['EN_COURS', 'REJETE'],
  EN_COURS:   ['EN_ATTENTE', 'DEDOUANE', 'REJETE'],
  EN_ATTENTE: ['EN_COURS', 'REJETE'],
  DEDOUANE:   ['CLOTURE'],
  CLOTURE:    [],
  REJETE:     [],
}

export function canTransition(from: DossierStatut, to: DossierStatut): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false
}

interface FilterUser { id: string; role: string; serviceId: string | null }

export function buildDossierFilter(user: FilterUser) {
  if (user.role === 'admin' || user.role === 'superviseur') return undefined
  if (user.role === 'responsable') return eq(dossiers.serviceId, user.serviceId!)
  return eq(dossiers.agentId, user.id)  // agent par défaut
}
