/** At most 10 photos per product (F-011 CA-4). */
export const MAX_PHOTOS = 10;

export const TOO_MANY_PHOTOS = `Máximo ${MAX_PHOTOS} fotos por producto.`;

export interface GalleryRow<I> {
  image: I;
  /** Variant ids, or variant documents when read with depth. */
  variants?: readonly (string | number | { id?: string | number | null })[] | null;
}

function variantId(value: string | number | { id?: string | number | null }): string {
  return typeof value === "object" ? String(value.id) : String(value);
}

/** The first row is the main photo (F-011 CA-5). */
export function mainImage<I>(gallery: readonly GalleryRow<I>[] | null | undefined): I | null {
  return gallery?.[0]?.image ?? null;
}

/**
 * Photos for one variant, in gallery order: those assigned to it, plus those assigned to no
 * variant (they show the product as a whole). A variant with no photo of its own gets them all.
 */
export function imagesForVariant<I>(
  gallery: readonly GalleryRow<I>[] | null | undefined,
  wanted: string | number,
): I[] {
  const rows = gallery ?? [];
  const own = rows.filter(
    (row) => !row.variants?.length || row.variants.some((id) => variantId(id) === String(wanted)),
  );
  const assigned = own.some((row) => row.variants?.length);
  return (assigned ? own : rows).map((row) => row.image);
}
