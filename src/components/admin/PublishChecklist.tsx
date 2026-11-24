"use client";

import { useConfig, useDocumentInfo } from "@payloadcms/ui";
import { useEffect, useId, useState } from "react";

interface Readiness {
  ready: boolean;
  lines: string[];
}

/**
 * "Para publicar" box in the product sidebar (F-010 CA-4): lists, from the server, everything
 * still missing in every language. Refreshes after each save, so the editor always sees the
 * full list instead of a single field error (which phones may never show).
 */
export function PublishChecklist() {
  const { id, lastUpdateTime } = useDocumentInfo();
  const { config } = useConfig();
  const headingId = useId();
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  useEffect(() => {
    if (id === undefined || id === null) return;
    const controller = new AbortController();
    // Same-origin path: the admin can be served from a different host than serverURL (previews).
    fetch(`${config.routes.api}/products/${id}/readiness`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? (response.json() as Promise<Readiness>) : null))
      .then((result) => {
        if (result) setReadiness(result);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [config.routes.api, id, lastUpdateTime]);

  return (
    <section className="publish-checklist" aria-labelledby={headingId}>
      <h2 id={headingId} className="publish-checklist__title">
        Para publicar
      </h2>
      <div aria-live="polite">
        {id === undefined || id === null ? (
          <p>Guarda el borrador para ver qué falta para publicar.</p>
        ) : readiness === null ? (
          <p>Comprobando…</p>
        ) : readiness.ready ? (
          <p>Listo para publicar.</p>
        ) : (
          <ul className="publish-checklist__list">
            {readiness.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
