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

/** F-012: the sample category (published by the seed), a subcategory and a collection. */
export const seedTaxonomy = {
  category: {
    slug: { es: "cuidado-facial", en: "face-care", de: "gesichtspflege" },
    description: {
      es: "Cremas y aceites para cuidar el rostro cada día.",
      en: "Creams and oils to care for your face every day.",
      de: "Cremes und Öle für die tägliche Gesichtspflege.",
    },
  },
  subcategory: {
    name: { es: "Cremas", en: "Creams", de: "Cremes" },
    slug: { es: "cremas", en: "creams", de: "cremes" },
  },
  collection: {
    name: { es: "Favoritos", en: "Favourites", de: "Lieblinge" },
    slug: { es: "favoritos", en: "favourites", de: "lieblinge" },
    description: {
      es: "Los productos que más nos piden.",
      en: "The products people ask for most.",
      de: "Die Produkte, nach denen am meisten gefragt wird.",
    },
  },
} as const;

/** Storefront paths of the sample category and collection in each language (F-012). */
export const seedCategoryPaths = {
  en: `/en/${seedTaxonomy.category.slug.en}`,
  de: `/de/${seedTaxonomy.category.slug.de}`,
  es: `/es/${seedTaxonomy.category.slug.es}`,
} as const;

export const seedCollectionPaths = {
  en: `/en/collections/${seedTaxonomy.collection.slug.en}`,
  de: `/de/kollektionen/${seedTaxonomy.collection.slug.de}`,
  es: `/es/colecciones/${seedTaxonomy.collection.slug.es}`,
} as const;
