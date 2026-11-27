"use client";

import { Link, useConfig, useDocumentInfo } from "@payloadcms/ui";
import type { UIFieldClientComponent } from "payload";

/**
 * "Ver historial" in a product's or variant's sidebar (F-018 HU-2): the audit log filtered to
 * this document, so "who changed this price" is one click away.
 */
export const AuditHistoryLink: UIFieldClientComponent = ({ field }) => {
  const { id } = useDocumentInfo();
  const { config } = useConfig();
  const entity = (field.admin?.custom as { entity?: string } | undefined)?.entity;
  if (id === undefined || id === null || !entity) return null;
  const query = new URLSearchParams({
    "where[entity][equals]": entity,
    "where[entityId][equals]": String(id),
  });
  return (
    <p className="audit-history-link">
      <Link href={`${config.routes.admin}/collections/audit-log?${query.toString()}`}>
        Ver historial
      </Link>
    </p>
  );
};
