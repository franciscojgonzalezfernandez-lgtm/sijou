import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_products_options_attribute" AS ENUM('size', 'scent', 'color');
  CREATE TYPE "public"."enum_variants_net_unit" AS ENUM('ml', 'g');
  CREATE TABLE "products_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL
  );
  
  CREATE TABLE "products_options_values" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"code" varchar
  );
  
  CREATE TABLE "products_options_values_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "products_options" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"attribute" "enum_products_options_attribute" NOT NULL
  );
  
  ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_media_fk";
  
  DROP INDEX "products_rels_media_id_idx";
  ALTER TABLE "products_rels" ADD COLUMN "variants_id" integer;
  ALTER TABLE "variants" ADD COLUMN "size" varchar;
  ALTER TABLE "variants" ADD COLUMN "scent" varchar;
  ALTER TABLE "variants" ADD COLUMN "color" varchar;
  ALTER TABLE "variants" ADD COLUMN "ean" varchar;
  ALTER TABLE "variants" ADD COLUMN "compare_at_price" numeric;
  ALTER TABLE "variants" ADD COLUMN "weight_grams" numeric;
  ALTER TABLE "variants" ADD COLUMN "net_quantity" numeric;
  ALTER TABLE "variants" ADD COLUMN "net_unit" "enum_variants_net_unit";
  ALTER TABLE "products_gallery" ADD CONSTRAINT "products_gallery_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "products_gallery" ADD CONSTRAINT "products_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_options_values" ADD CONSTRAINT "products_options_values_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_options"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_options_values_locales" ADD CONSTRAINT "products_options_values_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products_options_values"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "products_options" ADD CONSTRAINT "products_options_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_gallery_order_idx" ON "products_gallery" USING btree ("_order");
  CREATE INDEX "products_gallery_parent_id_idx" ON "products_gallery" USING btree ("_parent_id");
  CREATE INDEX "products_gallery_image_idx" ON "products_gallery" USING btree ("image_id");
  CREATE INDEX "products_options_values_order_idx" ON "products_options_values" USING btree ("_order");
  CREATE INDEX "products_options_values_parent_id_idx" ON "products_options_values" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_options_values_locales_locale_parent_id_unique" ON "products_options_values_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_options_values_locales_parent_id_idx" ON "products_options_values_locales" USING btree ("_parent_id");
  CREATE INDEX "products_options_order_idx" ON "products_options" USING btree ("_order");
  CREATE INDEX "products_options_parent_id_idx" ON "products_options" USING btree ("_parent_id");
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_variants_fk" FOREIGN KEY ("variants_id") REFERENCES "public"."variants"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_rels_variants_id_idx" ON "products_rels" USING btree ("variants_id");
  CREATE INDEX "variants_size_idx" ON "variants" USING btree ("size");
  CREATE INDEX "variants_scent_idx" ON "variants" USING btree ("scent");
  CREATE INDEX "variants_color_idx" ON "variants" USING btree ("color");
  -- F-011 D-1: the photos of each product move from "images" to the gallery, in the same order.
  INSERT INTO "products_gallery" ("_order", "_parent_id", "id", "image_id")
    SELECT COALESCE(r."order", 0), r."parent_id", substr(md5(random()::text || r."id"::text), 1, 24), r."media_id"
    FROM "products_rels" r
    WHERE r."path" = 'images' AND r."media_id" IS NOT NULL;
  DELETE FROM "products_rels" WHERE "path" = 'images';
  ALTER TABLE "products_rels" DROP COLUMN "media_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "products_gallery" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_options_values" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_options_values_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_options" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "products_rels" ADD COLUMN "media_id" integer;
  INSERT INTO "products_rels" ("order", "parent_id", "path", "media_id")
    SELECT "_order", "_parent_id", 'images', "image_id" FROM "products_gallery";
  DELETE FROM "products_rels" WHERE "variants_id" IS NOT NULL;
  DROP TABLE "products_gallery" CASCADE;
  DROP TABLE "products_options_values" CASCADE;
  DROP TABLE "products_options_values_locales" CASCADE;
  DROP TABLE "products_options" CASCADE;
  ALTER TABLE "products_rels" DROP CONSTRAINT "products_rels_variants_fk";
  
  DROP INDEX "products_rels_variants_id_idx";
  DROP INDEX "variants_size_idx";
  DROP INDEX "variants_scent_idx";
  DROP INDEX "variants_color_idx";
  ALTER TABLE "products_rels" ADD CONSTRAINT "products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "products_rels_media_id_idx" ON "products_rels" USING btree ("media_id");
  ALTER TABLE "products_rels" DROP COLUMN "variants_id";
  ALTER TABLE "variants" DROP COLUMN "size";
  ALTER TABLE "variants" DROP COLUMN "scent";
  ALTER TABLE "variants" DROP COLUMN "color";
  ALTER TABLE "variants" DROP COLUMN "ean";
  ALTER TABLE "variants" DROP COLUMN "compare_at_price";
  ALTER TABLE "variants" DROP COLUMN "weight_grams";
  ALTER TABLE "variants" DROP COLUMN "net_quantity";
  ALTER TABLE "variants" DROP COLUMN "net_unit";
  DROP TYPE "public"."enum_products_options_attribute";
  DROP TYPE "public"."enum_variants_net_unit";`)
}
