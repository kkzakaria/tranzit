CREATE TYPE "public"."audit_action" AS ENUM('DOSSIER_CREATED', 'DOSSIER_UPDATED', 'DOSSIER_STATUS_CHANGED', 'DOSSIER_ASSIGNED', 'DOCUMENT_UPLOADED', 'DOCUMENT_DELETED', 'CLIENT_CREATED', 'CLIENT_UPDATED', 'CLIENT_DELETED', 'USER_CREATED', 'USER_UPDATED', 'USER_DEACTIVATED', 'USER_REACTIVATED', 'USER_ROLE_CHANGED', 'USER_PASSWORD_CHANGED', 'USER_LOGIN', 'USER_LOGIN_FAILED', 'USER_LOGOUT', 'SESSION_REVOKED');--> statement-breakpoint
CREATE TYPE "public"."audit_entity" AS ENUM('DOSSIER', 'DOCUMENT', 'CLIENT', 'USER', 'SESSION');--> statement-breakpoint
CREATE TYPE "public"."client_type" AS ENUM('IMPORTATEUR', 'EXPORTATEUR', 'LES_DEUX');--> statement-breakpoint
CREATE TYPE "public"."dossier_statut" AS ENUM('BROUILLON', 'DEPOSE', 'EN_COURS', 'EN_ATTENTE', 'DEDOUANE', 'CLOTURE', 'REJETE');--> statement-breakpoint
CREATE TYPE "public"."dossier_type" AS ENUM('IMPORT', 'EXPORT', 'TRANSIT', 'ADMISSION_TEMPORAIRE');--> statement-breakpoint
CREATE TYPE "public"."type_doc" AS ENUM('FACTURE', 'CONNAISSEMENT', 'CERTIFICAT_ORIGINE', 'LISTE_COLISAGE', 'DECLARATION', 'LICENCE', 'BON_COMMANDE', 'AUTRE');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "audit_entity" NOT NULL,
	"entity_id" uuid,
	"action" "audit_action" NOT NULL,
	"user_id" uuid,
	"payload" jsonb,
	"ip" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" varchar(200) NOT NULL,
	"type" "client_type" NOT NULL,
	"rc" varchar(50),
	"nif" varchar(50),
	"contact" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dossier_id" uuid NOT NULL,
	"nom" varchar(255) NOT NULL,
	"type_doc" "type_doc" NOT NULL,
	"storage_key" text NOT NULL,
	"taille" integer NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dossiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(50) NOT NULL,
	"type" "dossier_type" NOT NULL,
	"statut" "dossier_statut" DEFAULT 'BROUILLON' NOT NULL,
	"regime_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dossiers_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "regimes_douaniers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"libelle" varchar(200) NOT NULL,
	"description" text,
	"actif" boolean DEFAULT true NOT NULL,
	CONSTRAINT "regimes_douaniers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nom" varchar(100) NOT NULL,
	"departement_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_dossier_id_dossiers_id_fk" FOREIGN KEY ("dossier_id") REFERENCES "public"."dossiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_regime_id_regimes_douaniers_id_fk" FOREIGN KEY ("regime_id") REFERENCES "public"."regimes_douaniers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dossiers" ADD CONSTRAINT "dossiers_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_departement_id_departements_id_fk" FOREIGN KEY ("departement_id") REFERENCES "public"."departements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id","created_at");