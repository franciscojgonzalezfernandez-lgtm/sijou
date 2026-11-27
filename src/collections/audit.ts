import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from "payload";

import {
  actionFor,
  type AuditAction,
  type Change,
  describeActor,
  diffDocs,
  redact,
} from "@/domain/audit/diff";
import type { AuditedEntity } from "@/domain/audit/entities";

export const AUDIT_LOG = "audit-log";

/** Every entity some collection or global audits, for the completeness test. */
export const auditedEntities = new Set<AuditedEntity>();

interface Entry {
  entity: AuditedEntity;
  entityId: string | null;
  entityLabel: string;
  action: AuditAction;
  locale: string | null;
  changes: Change[];
}

/**
 * Inserts one row with the caller's `req`, so it runs in the same transaction as the change:
 * if the audit row fails, the change is not saved either (F-018 CA-3). The access rules forbid
 * creating rows; this local call with `overrideAccess` is the only way in (CA-4).
 */
async function write(req: PayloadRequest, entry: Entry): Promise<void> {
  const changes = redact(entry.changes);
  if (changes.length === 0) return;
  await req.payload.create({
    collection: AUDIT_LOG,
    data: { ...entry, changes, at: new Date().toISOString(), ...describeActor(req.user) },
    depth: 0,
    overrideAccess: true,
    req,
  });
}

function editedLocale(req: PayloadRequest, localized: boolean): string | null {
  return localized && typeof req.locale === "string" && req.locale !== "all" ? req.locale : null;
}

interface CollectionAudit {
  entity: AuditedEntity;
  /** What a person recognises the document by (product name in Spanish, variant SKU). */
  label: (doc: Record<string, unknown>, req: PayloadRequest) => Promise<string> | string;
  /** The collection has translated fields: rows record the language edited. */
  localized?: boolean;
  /** Fields that are not the document's own data (join fields). */
  ignore?: readonly string[];
}

export function auditHooks({ entity, label, localized = false, ignore = [] }: CollectionAudit): {
  afterChange: CollectionAfterChangeHook;
  afterDelete: CollectionAfterDeleteHook;
} {
  auditedEntities.add(entity);
  return {
    afterChange: async ({ doc: changed, previousDoc, operation, req }) => {
      const doc = changed as Record<string, unknown>;
      const changes = diffDocs(operation === "create" ? null : previousDoc, doc, ignore);
      await write(req, {
        entity,
        entityId: String(doc.id),
        entityLabel: await label(doc, req),
        action: actionFor(operation, changes),
        locale: editedLocale(req, localized),
        changes,
      });
      return doc;
    },
    afterDelete: async ({ doc: deleted, req }) => {
      const doc = deleted as Record<string, unknown>;
      await write(req, {
        entity,
        entityId: String(doc.id),
        entityLabel: await label(doc, req),
        action: "delete",
        locale: null,
        changes: diffDocs(doc, null, ignore),
      });
      return doc;
    },
  };
}

export function auditGlobalHooks({
  entity,
  label,
}: {
  entity: AuditedEntity;
  label: string;
}): GlobalAfterChangeHook {
  auditedEntities.add(entity);
  return async ({ doc: saved, previousDoc, req }) => {
    const doc = saved as Record<string, unknown>;
    const changes = diffDocs(previousDoc, doc);
    await write(req, {
      entity,
      entityId: null,
      entityLabel: label,
      action: actionFor("update", changes),
      locale: null,
      changes,
    });
    return doc;
  };
}
