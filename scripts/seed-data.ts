/** Sample catalog for previews and local runs (F-010). Shared by the seed, E2E and Lighthouse. */
export const SEED_SKU = "SEED-LAV-50";

export const seedProduct = {
  slug: { es: "crema-facial-de-lavanda", en: "lavender-face-cream", de: "lavendel-gesichtscreme" },
  name: { es: "Crema facial de lavanda", en: "Lavender face cream", de: "Lavendel-Gesichtscreme" },
  shortDescription: {
    es: "Crema ligera de lavanda para todo tipo de piel.",
    en: "A light lavender cream for every skin type.",
    de: "Leichte Lavendelcreme für jeden Hauttyp.",
  },
  description: {
    es: "Elaborada a mano en pequeños lotes con aceites vegetales y lavanda.",
    en: "Handmade in small batches with plant oils and lavender.",
    de: "In kleinen Chargen von Hand mit Pflanzenölen und Lavendel hergestellt.",
  },
  usage: {
    es: "Aplicar por la mañana y por la noche sobre la piel limpia.",
    en: "Apply morning and evening to clean skin.",
    de: "Morgens und abends auf die gereinigte Haut auftragen.",
  },
  pao: { es: "12 meses", en: "12 months", de: "12 Monate" },
  alt: {
    es: "Tarro de crema facial de lavanda sobre fondo claro",
    en: "Jar of lavender face cream on a light background",
    de: "Tiegel Lavendel-Gesichtscreme vor hellem Hintergrund",
  },
  category: { es: "Cuidado facial", en: "Face care", de: "Gesichtspflege" },
  price: 24.9,
} as const;

/** Storefront path of the sample product in each language (F-010 D-3). */
export const seedProductPaths = {
  en: `/en/products/${seedProduct.slug.en}`,
  de: `/de/produkte/${seedProduct.slug.de}`,
  es: `/es/productos/${seedProduct.slug.es}`,
} as const;
