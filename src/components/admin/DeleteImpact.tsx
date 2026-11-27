"use client";

import { useConfig, useDocumentInfo } from "@payloadcms/ui";
import { useEffect, useId, useState } from "react";

interface Impact {
  children: string[];
  products: number;
  orphans: { id: number; name: string }[];
}

/**
 * "Al borrarla" box in the category sidebar (F-012 CA-5): before anyone confirms a delete, says
 * whether it is blocked by subcategories and which products would be left without a category.
 */
export function DeleteImpact() {
  const { id, lastUpdateTime } = useDocumentInfo();
  const { config } = useConfig();
  const headingId = useId();
  const [impact, setImpact] = useState<Impact | null>(null);

  useEffect(() => {
    if (id === undefined || id === null) return;
    const controller = new AbortController();
    // Same-origin path: the admin can be served from a different host than serverURL (previews).
    fetch(`${config.routes.api}/categories/${id}/delete-impact`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? (response.json() as Promise<Impact>) : null))
      .then((result) => {
        if (result) setImpact(result);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [config.routes.api, id, lastUpdateTime]);

  if (id === undefined || id === null) return null;

  return (
    <section className="publish-checklist" aria-labelledby={headingId}>
      <h2 id={headingId} className="publish-checklist__title">
        Al borrarla
      </h2>
      <div aria-live="polite">
        {impact === null ? (
          <p>Comprobando…</p>
        ) : impact.children.length > 0 ? (
          <>
            <p>No se puede borrar: tiene subcategorías. Muévelas o bórralas antes.</p>
            <ul className="publish-checklist__list">
              {impact.children.map((child) => (
                <li key={child}>{child}</li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p>
              {impact.products === 0
                ? "No tiene productos."
                : `Sus ${impact.products} productos no se borran: solo pierden esta categoría.`}
            </p>
            {impact.orphans.length > 0 && (
              <>
                <p>Se quedarían sin ninguna categoría:</p>
                <ul className="publish-checklist__list">
                  {impact.orphans.map((product) => (
                    <li key={product.id}>
                      <a href={`${config.routes.admin}/collections/products/${product.id}`}>
                        {product.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
