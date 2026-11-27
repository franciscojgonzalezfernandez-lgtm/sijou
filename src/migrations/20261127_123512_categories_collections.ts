import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_categories_status" AS ENUM('draft', 'published', 'hidden');
  CREATE TYPE "public"."enum_product_collections_status" AS ENUM('draft', 'published', 'hidden');
  CREATE TABLE "product_collections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"visible_from" timestamp(3) with time zone,
  	"visible_until" timestamp(3) with time zone,
  	"status" "enum_product_collections_status" DEFAULT 'draft' NOT NULL,
  	"header_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "product_collections_locales" (
  	"name" varchar NOT NULL,
  	"slug" varchar,
  	"description" jsonb,
  	"seo_title" varchar,
  	"seo_description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "product_collections_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  ALTER TABLE "categories" ADD COLUMN "parent_id" integer;
  ALTER TABLE "categories" ADD COLUMN "position" numeric DEFAULT 0 NOT NULL;
  ALTER TABLE "categories" ADD COLUMN "status" "enum_categories_status" DEFAULT 'draft' NOT NULL;
  -- F-012: categories that already exist (the seed's) stay visible in the shop.
  UPDATE "categories" SET "status" = 'published';
  ALTER TABLE "categories" ADD COLUMN "header_image_id" integer;
  ALTER TABLE "categories_locales" ADD COLUMN "description" jsonb;
  ALTER TABLE "categories_locales" ADD COLUMN "seo_title" varchar;
  ALTER TABLE "categories_locales" ADD COLUMN "seo_description" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "product_collections_id" integer;
  ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_header_image_id_media_id_fk" FOREIGN KEY ("header_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "product_collections_locales" ADD CONSTRAINT "product_collections_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."product_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_collections_rels" ADD CONSTRAINT "product_collections_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."product_collections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "product_collections_rels" ADD CONSTRAINT "product_collections_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "product_collections_status_idx" ON "product_collections" USING btree ("status");
  CREATE INDEX "product_collections_header_image_idx" ON "product_collections" USING btree ("header_image_id");
  CREATE INDEX "product_collections_updated_at_idx" ON "product_collections" USING btree ("updated_at");
  CREATE INDEX "product_collections_created_at_idx" ON "product_collections" USING btree ("created_at");
  CREATE INDEX "product_collections_slug_idx" ON "product_collections_locales" USING btree ("slug","_locale");
  CREATE UNIQUE INDEX "product_collections_locales_locale_parent_id_unique" ON "product_collections_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "product_collections_locales_parent_id_idx" ON "product_collections_locales" USING btree ("_parent_id");
  CREATE INDEX "product_collections_rels_order_idx" ON "product_collections_rels" USING btree ("order");
  CREATE INDEX "product_collections_rels_parent_idx" ON "product_collections_rels" USING btree ("parent_id");
  CREATE INDEX "product_collections_rels_path_idx" ON "product_collections_rels" USING btree ("path");
  CREATE INDEX "product_collections_rels_products_id_idx" ON "product_collections_rels" USING btree ("products_id");
  ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_header_image_id_media_id_fk" FOREIGN KEY ("header_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_collections_fk" FOREIGN KEY ("product_collections_id") REFERENCES "public"."product_collections"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "categories_parent_idx" ON "categories" USING btree ("parent_id");
  CREATE INDEX "categories_status_idx" ON "categories" USING btree ("status");
  CREATE INDEX "categories_header_image_idx" ON "categories" USING btree ("header_image_id");
  CREATE INDEX "payload_locked_documents_rels_product_collections_id_idx" ON "payload_locked_documents_rels" USING btree ("product_collections_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "product_collections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "product_collections_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "product_collections_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "product_collections" CASCADE;
  DROP TABLE "product_collections_locales" CASCADE;
  DROP TABLE "product_collections_rels" CASCADE;
  ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_categories_id_fk";
  
  ALTER TABLE "categories" DROP CONSTRAINT "categories_header_image_id_media_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_product_collections_fk";
  
  DROP INDEX "categories_parent_idx";
  DROP INDEX "categories_status_idx";
  DROP INDEX "categories_header_image_idx";
  DROP INDEX "payload_locked_documents_rels_product_collections_id_idx";
  ALTER TABLE "categories" DROP COLUMN "parent_id";
  ALTER TABLE "categories" DROP COLUMN "position";
  ALTER TABLE "categories" DROP COLUMN "status";
  ALTER TABLE "categories" DROP COLUMN "header_image_id";
  ALTER TABLE "categories_locales" DROP COLUMN "description";
  ALTER TABLE "categories_locales" DROP COLUMN "seo_title";
  ALTER TABLE "categories_locales" DROP COLUMN "seo_description";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "product_collections_id";
  DROP TYPE "public"."enum_categories_status";
  DROP TYPE "public"."enum_product_collections_status";`)
}
