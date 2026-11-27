import { RichText } from "@payloadcms/richtext-lexical/react";
import type { ReactNode } from "react";

import { Link } from "@/components/ui/link";
import type { ProductLink } from "@/lib/navigation";
import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";
import type { ResponsiveImage } from "@/domain/products/images";

interface Props {
  name: string;
  image: (ResponsiveImage & { alt: string }) | null;
  description: SerializedEditorState | null;
  products: ProductLink[];
  labels: { products: string; empty: string };
  /** Above the title (breadcrumbs). */
  before?: ReactNode;
  /** Between the text and the products (subcategories). */
  children?: ReactNode;
}

/**
 * Minimal category and collection page (F-012 D-1). F-021 adds the product grid, stock state,
 * subcategory aggregation and pagination.
 */
export function TaxonomyPage({
  name,
  image,
  description,
  products,
  labels,
  before,
  children,
}: Props) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="page-gutter mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 py-10"
    >
      {before}
      <h1 className="type-title text-brand">{name}</h1>
      {image && (
        // F-010 D-2: Payload already generates WebP sizes; Vercel image optimization would use quota.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image.src}
          srcSet={image.srcSet}
          sizes="(min-width: 42rem) 40rem, calc(100vw - 2rem)"
          width={image.width}
          height={image.height}
          alt={image.alt}
          fetchPriority="high"
          className="bg-surface h-auto w-full rounded-md"
        />
      )}
      {description && (
        <div className="type-body measure flex flex-col gap-4">
          <RichText data={description} />
        </div>
      )}
      {children}
      <section aria-labelledby="products" className="flex flex-col gap-2">
        <h2 id="products" className="type-subtitle text-brand">
          {labels.products}
        </h2>
        {products.length === 0 ? (
          <p className="type-body">{labels.empty}</p>
        ) : (
          <ul className="flex flex-col">
            {products.map((product) => (
              <li key={product.slug}>
                <Link
                  variant="nav"
                  href={{ pathname: "/products/[slug]", params: { slug: product.slug } }}
                >
                  {product.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
