import { describe, test, expect } from 'bun:test'
import { canTransition, buildDossierFilter } from './dossiers.service'

describe('canTransition', () => {
  test('BROUILLON → DEPOSE est valide', () => {
    expect(canTransition('BROUILLON', 'DEPOSE')).toBe(true)
  })
  test('CLOTURE → EN_COURS est invalide', () => {
    expect(canTransition('CLOTURE', 'EN_COURS')).toBe(false)
  })
  test('EN_COURS → REJETE est valide', () => {
    expect(canTransition('EN_COURS', 'REJETE')).toBe(true)
  })
  test('DEDOUANE → CLOTURE est valide', () => {
    expect(canTransition('DEDOUANE', 'CLOTURE')).toBe(true)
  })
})

describe('buildDossierFilter', () => {
  test('admin retourne undefined (pas de filtre)', () => {
    const filter = buildDossierFilter({ id: 'u1', role: 'admin', serviceId: 's1' })
    expect(filter).toBeUndefined()
  })
  test('superviseur retourne undefined', () => {
    const filter = buildDossierFilter({ id: 'u1', role: 'superviseur', serviceId: 's1' })
    expect(filter).toBeUndefined()
  })
  test('agent retourne un filtre (défini)', () => {
    const filter = buildDossierFilter({ id: 'u1', role: 'agent', serviceId: 's1' })
    expect(filter).toBeDefined()
  })
  test('responsable retourne un filtre (défini)', () => {
    const filter = buildDossierFilter({ id: 'u1', role: 'responsable', serviceId: 's1' })
    expect(filter).toBeDefined()
  })
})
