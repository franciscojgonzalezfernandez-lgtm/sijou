/** Product lifecycle (F-010 CA-5). Values are stored in English; the admin shows Spanish labels. */
export const productStatuses = ["draft", "published", "hidden", "archived"] as const;

export type ProductStatus = (typeof productStatuses)[number];

export const productStatusLabels: Record<ProductStatus, string> = {
  draft: "Borrador",
  published: "Publicado",
  hidden: "Oculto",
  archived: "Archivado",
};

/** F-010 CA-7. */
export const restockTypes = ["replenishable", "limited"] as const;

export type RestockType = (typeof restockTypes)[number];

export const restockTypeLabels: Record<RestockType, string> = {
  replenishable: "Reponible",
  limited: "Edición limitada",
};

/** CA-5: only published products reach the shop, whatever their stock (CA-9). */
export function isVisibleInStore(status: string | null | undefined): boolean {
  return status === "published";
}
