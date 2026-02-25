import {
  pgTable, uuid, varchar, text, timestamp, boolean,
  pgEnum, integer, jsonb, index,
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const dossierTypeEnum   = pgEnum('dossier_type',   ['IMPORT','EXPORT','TRANSIT','ADMISSION_TEMPORAIRE'])
export const dossierStatutEnum = pgEnum('dossier_statut', ['BROUILLON','DEPOSE','EN_COURS','EN_ATTENTE','DEDOUANE','CLOTURE','REJETE'])
export const clientTypeEnum    = pgEnum('client_type',    ['IMPORTATEUR','EXPORTATEUR','LES_DEUX'])
export const typeDocEnum       = pgEnum('type_doc',       ['FACTURE','CONNAISSEMENT','CERTIFICAT_ORIGINE','LISTE_COLISAGE','DECLARATION','LICENCE','BON_COMMANDE','AUTRE'])
export const auditEntityEnum   = pgEnum('audit_entity',   ['DOSSIER','DOCUMENT','CLIENT','USER','SESSION'])
export const auditActionEnum   = pgEnum('audit_action',   [
  'DOSSIER_CREATED','DOSSIER_UPDATED','DOSSIER_STATUS_CHANGED','DOSSIER_ASSIGNED',
  'DOCUMENT_UPLOADED','DOCUMENT_DELETED',
  'CLIENT_CREATED','CLIENT_UPDATED','CLIENT_DELETED',
  'USER_CREATED','USER_UPDATED','USER_DEACTIVATED','USER_REACTIVATED',
  'USER_ROLE_CHANGED','USER_PASSWORD_CHANGED',
  'USER_LOGIN','USER_LOGIN_FAILED','USER_LOGOUT',
  'SESSION_REVOKED',
])

// ─── Organisation ─────────────────────────────────────────────────────────────

export const departements = pgTable('departements', {
  id:          uuid('id').primaryKey().defaultRandom(),
  nom:         varchar('nom', { length: 100 }).notNull(),
  description: text('description'),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

export const services = pgTable('services', {
  id:             uuid('id').primaryKey().defaultRandom(),
  nom:            varchar('nom', { length: 100 }).notNull(),
  departementId:  uuid('departement_id').references(() => departements.id).notNull(),
  createdAt:      timestamp('created_at').defaultNow().notNull(),
})

// ─── Référentiel ──────────────────────────────────────────────────────────────

export const regimesDouaniers = pgTable('regimes_douaniers', {
  id:          uuid('id').primaryKey().defaultRandom(),
  code:        varchar('code', { length: 10 }).notNull().unique(),
  libelle:     varchar('libelle', { length: 200 }).notNull(),
  description: text('description'),
  actif:       boolean('actif').notNull().default(true),
})

// ─── Clients ──────────────────────────────────────────────────────────────────

export const clients = pgTable('clients', {
  id:        uuid('id').primaryKey().defaultRandom(),
  nom:       varchar('nom', { length: 200 }).notNull(),
  type:      clientTypeEnum('type').notNull(),
  rc:        varchar('rc', { length: 50 }),
  nif:       varchar('nif', { length: 50 }),
  contact:   text('contact'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Dossiers ─────────────────────────────────────────────────────────────────

export const dossiers = pgTable('dossiers', {
  id:          uuid('id').primaryKey().defaultRandom(),
  reference:   varchar('reference', { length: 50 }).notNull().unique(),
  type:        dossierTypeEnum('type').notNull(),
  statut:      dossierStatutEnum('statut').notNull().default('BROUILLON'),
  regimeId:    uuid('regime_id').references(() => regimesDouaniers.id).notNull(),
  clientId:    uuid('client_id').references(() => clients.id).notNull(),
  agentId:     uuid('agent_id').notNull(),
  serviceId:   uuid('service_id').references(() => services.id).notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
  updatedAt:   timestamp('updated_at').defaultNow().notNull(),
})

// ─── Documents ────────────────────────────────────────────────────────────────

export const documents = pgTable('documents', {
  id:          uuid('id').primaryKey().defaultRandom(),
  dossierId:   uuid('dossier_id').references(() => dossiers.id, { onDelete: 'cascade' }).notNull(),
  nom:         varchar('nom', { length: 255 }).notNull(),
  typeDoc:     typeDocEnum('type_doc').notNull(),
  storageKey:  text('storage_key').notNull(),
  taille:      integer('taille').notNull(),
  uploadedBy:  uuid('uploaded_by').notNull(),
  createdAt:   timestamp('created_at').defaultNow().notNull(),
})

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id:         uuid('id').primaryKey().defaultRandom(),
  entityType: auditEntityEnum('entity_type').notNull(),
  entityId:   uuid('entity_id'),
  action:     auditActionEnum('action').notNull(),
  userId:     uuid('user_id'),
  payload:    jsonb('payload'),
  ip:         varchar('ip', { length: 45 }),
  userAgent:  text('user_agent'),
  createdAt:  timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('audit_entity_idx').on(t.entityType, t.entityId, t.createdAt),
])
