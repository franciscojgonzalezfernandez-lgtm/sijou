import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_stock_movements_reason" AS ENUM('receipt', 'breakage', 'gift', 'correction', 'other', 'sale', 'expiry');
  CREATE TYPE "public"."enum_stock_movements_ref_type" AS ENUM('lot', 'adjustment', 'order', 'expiry');
  ALTER TYPE "public"."enum_audit_log_entity" ADD VALUE 'lots' BEFORE 'settings';
  CREATE TABLE "lots" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"variant_id" integer NOT NULL,
  	"code" varchar NOT NULL,
  	"quantity_initial" numeric NOT NULL,
  	"quantity_available" numeric NOT NULL,
  	"received_at" timestamp(3) with time zone NOT NULL,
  	"expires_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stock_movements" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"at" timestamp(3) with time zone NOT NULL,
  	"variant_id" numeric NOT NULL,
  	"variant_sku" varchar NOT NULL,
  	"lot_id" numeric,
  	"lot_code" varchar,
  	"delta" numeric NOT NULL,
  	"quantity_after" numeric NOT NULL,
  	"reason" "enum_stock_movements_reason" NOT NULL,
  	"ref_type" "enum_stock_movements_ref_type" NOT NULL,
  	"ref_id" varchar,
  	"comment" varchar,
  	"actor_email" varchar,
  	"actor_id" numeric
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "lots_id" integer;
  ALTER TABLE "lots" ADD CONSTRAINT "lots_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "lots_variant_idx" ON "lots" USING btree ("variant_id");
  CREATE INDEX "lots_code_idx" ON "lots" USING btree ("code");
  CREATE INDEX "lots_expires_at_idx" ON "lots" USING btree ("expires_at");
  CREATE INDEX "lots_updated_at_idx" ON "lots" USING btree ("updated_at");
  CREATE INDEX "lots_created_at_idx" ON "lots" USING btree ("created_at");
  CREATE INDEX "stock_movements_at_idx" ON "stock_movements" USING btree ("at");
  CREATE INDEX "stock_movements_variant_id_idx" ON "stock_movements" USING btree ("variant_id");
  CREATE INDEX "stock_movements_lot_id_idx" ON "stock_movements" USING btree ("lot_id");
  CREATE INDEX "stock_movements_reason_idx" ON "stock_movements" USING btree ("reason");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_lots_fk" FOREIGN KEY ("lots_id") REFERENCES "public"."lots"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_lots_id_idx" ON "payload_locked_documents_rels" USING btree ("lots_id");`)

  // F-013, added by hand. CA-5: a lot never goes below 0, whole units only. D-2: a lot code is
  // unique within its variant. CA-3: FEFO lookups. CA-6: movements are append-only.
  await db.execute(sql`
  ALTER TABLE "lots" ADD CONSTRAINT "lots_quantity_available_check"
    CHECK ("quantity_available" >= 0 AND "quantity_available" = trunc("quantity_available"));
  ALTER TABLE "lots" ADD CONSTRAINT "lots_quantity_initial_check"
    CHECK ("quantity_initial" >= 1 AND "quantity_initial" = trunc("quantity_initial"));
  ALTER TABLE "lots" ADD CONSTRAINT "lots_variant_code_unique" UNIQUE ("variant_id", "code");
  CREATE INDEX "lots_fefo_idx" ON "lots" USING btree ("variant_id", "expires_at", "received_at", "id");
  ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_delta_check"
    CHECK ("delta" <> 0 AND "delta" = trunc("delta"));
  CREATE INDEX "stock_movements_variant_at_idx" ON "stock_movements" USING btree ("variant_id", "at" DESC);
  CREATE FUNCTION stock_movements_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN RAISE EXCEPTION 'stock_movements is append-only'; END $$;
  CREATE TRIGGER stock_movements_no_update_delete BEFORE UPDATE OR DELETE ON "stock_movements"
    FOR EACH ROW EXECUTE FUNCTION stock_movements_immutable();`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TRIGGER IF EXISTS stock_movements_no_update_delete ON "stock_movements";
  DROP FUNCTION IF EXISTS stock_movements_immutable();
  ALTER TABLE "lots" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stock_movements" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "lots" CASCADE;
  DROP TABLE "stock_movements" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_lots_fk";
  
  ALTER TABLE "audit_log" ALTER COLUMN "entity" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_log_entity";
  CREATE TYPE "public"."enum_audit_log_entity" AS ENUM('products', 'variants', 'settings');
  ALTER TABLE "audit_log" ALTER COLUMN "entity" SET DATA TYPE "public"."enum_audit_log_entity" USING "entity"::"public"."enum_audit_log_entity";
  DROP INDEX "payload_locked_documents_rels_lots_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "lots_id";
  DROP TYPE "public"."enum_stock_movements_reason";
  DROP TYPE "public"."enum_stock_movements_ref_type";`)
}
