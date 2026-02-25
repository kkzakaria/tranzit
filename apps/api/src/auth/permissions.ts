import { createAccessControl } from 'better-auth/plugins/access'

/**
 * Définition des ressources et actions du système douanier.
 * Utilisé par le plugin admin de Better Auth pour le contrôle d'accès RBAC.
 */
export const ac = createAccessControl({
  dossier:  ['create', 'read', 'update', 'delete', 'reassign'] as const,
  document: ['upload', 'read', 'delete'] as const,
  client:   ['create', 'read', 'update', 'delete'] as const,
  user:     ['create', 'read', 'update', 'delete'] as const,
})

/**
 * admin — accès complet à toutes les ressources.
 */
export const adminRole = ac.newRole({
  dossier:  ['create', 'read', 'update', 'delete', 'reassign'],
  document: ['upload', 'read', 'delete'],
  client:   ['create', 'read', 'update', 'delete'],
  user:     ['create', 'read', 'update', 'delete'],
})

/**
 * responsable — gestion des dossiers/documents/clients, sans suppression de dossiers
 * ni gestion des utilisateurs.
 */
export const responsableRole = ac.newRole({
  dossier:  ['create', 'read', 'update', 'reassign'],
  document: ['upload', 'read', 'delete'],
  client:   ['create', 'read', 'update'],
})

/**
 * agent — création et mise à jour des dossiers, upload de documents,
 * lecture seule sur les clients.
 */
export const agentRole = ac.newRole({
  dossier:  ['create', 'read', 'update'],
  document: ['upload', 'read'],
  client:   ['read'],
})

/**
 * superviseur — lecture seule sur toutes les ressources.
 */
export const superviseurRole = ac.newRole({
  dossier:  ['read'],
  document: ['read'],
  client:   ['read'],
})
