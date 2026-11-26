import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "sizes_w240_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_w240_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_w240_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_w240_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_w240_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_w240_filename" varchar;
  CREATE INDEX "media_sizes_w240_sizes_w240_filename_idx" ON "media" USING btree ("sizes_w240_filename");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "media_sizes_w240_sizes_w240_filename_idx";
  ALTER TABLE "media" DROP COLUMN "sizes_w240_url";
  ALTER TABLE "media" DROP COLUMN "sizes_w240_width";
  ALTER TABLE "media" DROP COLUMN "sizes_w240_height";
  ALTER TABLE "media" DROP COLUMN "sizes_w240_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_w240_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_w240_filename";`)
}
