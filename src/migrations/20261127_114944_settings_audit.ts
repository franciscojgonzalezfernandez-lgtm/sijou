import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_audit_log_entity" AS ENUM('products', 'variants', 'settings');
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('create', 'update', 'delete', 'status');
  CREATE TABLE "audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"actor_email" varchar,
  	"actor_id" numeric,
  	"entity" "enum_audit_log_entity" NOT NULL,
  	"entity_id" varchar,
  	"entity_label" varchar,
  	"action" "enum_audit_log_action" NOT NULL,
  	"locale" varchar,
  	"changes" jsonb
  );
  
  CREATE TABLE "settings_alert_emails" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL
  );
  
  CREATE TABLE "settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"store_name" varchar DEFAULT 'Sijôu' NOT NULL,
  	"contact_email" varchar,
  	"impressum_address" varchar,
  	"low_stock_threshold" numeric DEFAULT 5,
  	"offer_days_before_expiry" numeric DEFAULT 30,
  	"expiry_warning_days" numeric DEFAULT 30,
  	"free_shipping_threshold" numeric,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "settings_alert_emails" ADD CONSTRAINT "settings_alert_emails_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "audit_log_at_idx" ON "audit_log" USING btree ("at");
  CREATE INDEX "audit_log_actor_email_idx" ON "audit_log" USING btree ("actor_email");
  CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity");
  CREATE INDEX "audit_log_entity_id_idx" ON "audit_log" USING btree ("entity_id");
  CREATE INDEX "settings_alert_emails_order_idx" ON "settings_alert_emails" USING btree ("_order");
  CREATE INDEX "settings_alert_emails_parent_id_idx" ON "settings_alert_emails" USING btree ("_parent_id");`)

  // F-018 CA-4, CA-6: the audit log is append-only, whatever the client. Row triggers do not fire
  // on TRUNCATE, so test databases can still be reset.
  await db.execute(sql`
  CREATE FUNCTION audit_log_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN RAISE EXCEPTION 'audit_log is append-only'; END $$;
  CREATE TRIGGER audit_log_no_update_delete BEFORE UPDATE OR DELETE ON "audit_log"
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TRIGGER IF EXISTS audit_log_no_update_delete ON "audit_log";
  DROP FUNCTION IF EXISTS audit_log_immutable();
  DROP TABLE "audit_log" CASCADE;
  DROP TABLE "settings_alert_emails" CASCADE;
  DROP TABLE "settings" CASCADE;
  DROP TYPE "public"."enum_audit_log_entity";
  DROP TYPE "public"."enum_audit_log_action";`)
}
