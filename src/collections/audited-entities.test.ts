import { describe, expect, it } from "vitest";

import { AUDITED_ENTITIES } from "@/domain/audit/entities";
import { Settings } from "@/globals/Settings";

import { auditedEntities } from "./audit";
import { AuditLog } from "./AuditLog";
import { Lots } from "./Lots";
import { Products } from "./Products";
import { Variants } from "./Variants";

describe("audited entities (F-018 CA-3)", () => {
  it("every audited collection or global has a label in the audit log, and the other way round", () => {
    expect([Products.slug, Variants.slug, Lots.slug, Settings.slug]).toEqual([
      "products",
      "variants",
      "lots",
      "settings",
    ]);
    expect([...auditedEntities].sort()).toEqual(Object.keys(AUDITED_ENTITIES).sort());
    const entity = AuditLog.fields
      .flatMap((field) => ("fields" in field ? field.fields : [field]))
      .find((field) => "name" in field && field.name === "entity");
    expect(
      entity && "options" in entity
        ? entity.options.map((o) => (o as { value: string }).value)
        : [],
    ).toEqual(Object.keys(AUDITED_ENTITIES));
  });
});
