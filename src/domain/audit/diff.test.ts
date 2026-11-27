import { describe, expect, it } from "vitest";

import {
  actionFor,
  type Change,
  describeActor,
  diffDocs,
  isSensitivePath,
  MAX_TEXT_LENGTH,
  redact,
  SENSITIVE_KEYS,
} from "./diff";

const media = (id: number) => ({ id, alt: "Foto", createdAt: "2026-11-01", url: "/m.webp" });

function richText(text: string) {
  return {
    root: {
      type: "root",
      children: [
        { type: "paragraph", children: [{ type: "text", text }] },
        { type: "paragraph", children: [{ type: "linebreak" }, { type: "text", text: "Fin" }] },
      ],
    },
  };
}

describe("diffDocs (F-018 CA-3)", () => {
  it("no changes → []", () => {
    const doc = { id: 1, name: "Crema", price: 10, updatedAt: "a" };
    expect(diffDocs(doc, { ...doc, updatedAt: "b" })).toEqual([]);
  });

  it("whole stored documents (id and timestamps) are compared field by field", () => {
    const stored = { id: 1, globalType: "settings", createdAt: "a", updatedAt: "a" };
    expect(
      diffDocs({ ...stored, lowStockThreshold: 5 }, { ...stored, lowStockThreshold: 6 }),
    ).toEqual([{ path: "lowStockThreshold", before: 5, after: 6 }]);
    expect(diffDocs({ lowStockThreshold: 5 }, { ...stored, lowStockThreshold: 6 })).toEqual([
      { path: "lowStockThreshold", before: 5, after: 6 },
    ]);
  });

  it("a simple field", () => {
    expect(diffDocs({ lowStockThreshold: 5 }, { lowStockThreshold: 6 })).toEqual([
      { path: "lowStockThreshold", before: 5, after: 6 },
    ]);
  });

  it("nested groups become dotted paths; missing values are null", () => {
    expect(diffDocs({ seo: { title: "A" } }, { seo: { title: "B", description: "D" } })).toEqual([
      { path: "seo.description", before: null, after: "D" },
      { path: "seo.title", before: "A", after: "B" },
    ]);
  });

  it("localized values in every language (locale all) become name.<locale>", () => {
    expect(
      diffDocs({ name: { es: "Crema", de: null } }, { name: { es: "Crema", de: "Creme" } }),
    ).toEqual([{ path: "name.de", before: null, after: "Creme" }]);
  });

  it("arrays are whole values: a reorder is a change, row ids are ignored", () => {
    const before = {
      gallery: [
        { id: "a", image: media(1) },
        { id: "b", image: media(2) },
      ],
    };
    const after = {
      gallery: [
        { id: "b", image: 2 },
        { id: "a", image: 1 },
      ],
    };
    expect(diffDocs(before, after)).toEqual([
      {
        path: "gallery",
        before: [{ image: 1 }, { image: 2 }],
        after: [{ image: 2 }, { image: 1 }],
      },
    ]);
  });

  it("a populated relation and its id are the same value (no false change)", () => {
    expect(diffDocs({ product: { id: 3, name: "X", updatedAt: "t" } }, { product: 3 })).toEqual([]);
    expect(diffDocs({ categories: [media(1)] }, { categories: [1] })).toEqual([]);
  });

  it("rich text is compared and stored as plain text", () => {
    expect(diffDocs({ description: richText("Hola") }, { description: richText("Adiós") })).toEqual(
      [{ path: "description", before: "Hola\nFin", after: "Adiós\nFin" }],
    );
    expect(diffDocs({ description: { root: { type: "root", children: [null] } } }, {})).toEqual([]);
  });

  it("long texts are cut", () => {
    const [change] = diffDocs({ inci: "" }, { inci: "x".repeat(MAX_TEXT_LENGTH + 10) });
    expect(change?.after).toBe("x".repeat(MAX_TEXT_LENGTH) + "… [recortado]");
  });

  it("ignored fields (join fields) are left out", () => {
    const before = { name: "A", variants: { docs: [1], hasNextPage: false } };
    const after = { name: "B", variants: { docs: [1, 2], hasNextPage: false } };
    expect(diffDocs(before, after, ["variants"])).toEqual([
      { path: "name", before: "A", after: "B" },
    ]);
  });

  it("create (nothing before) and delete (nothing after)", () => {
    expect(diffDocs(undefined, { id: 9, sku: "A-1" })).toEqual([
      { path: "sku", before: null, after: "A-1" },
    ]);
    expect(diffDocs({ id: 9, sku: "A-1" }, null)).toEqual([
      { path: "sku", before: "A-1", after: null },
    ]);
  });

  it("booleans, numbers and objects inside arrays", () => {
    expect(
      diffDocs(
        { active: true, rows: [{ a: { b: 1 } }] },
        { active: false, rows: [{ a: { b: 2 } }] },
      ),
    ).toEqual([
      { path: "active", before: true, after: false },
      { path: "rows", before: [{ a: { b: 1 } }], after: [{ a: { b: 2 } }] },
    ]);
  });
});

describe("sensitive fields (F-018 CA-5)", () => {
  it.each(SENSITIVE_KEYS)("%s never appears", (key) => {
    expect(diffDocs({ [key]: "old" }, { [key]: "new", email: "a@x.ch" })).toEqual([
      { path: "email", before: null, after: "a@x.ch" },
    ]);
  });

  it("any key containing password, token or secret, in any case and nested", () => {
    const before = { auth: { NewPassword: "a", refreshToken: "b", clientSecret: "c" } };
    const after = { auth: { NewPassword: "x", refreshToken: "y", clientSecret: "z" } };
    expect(diffDocs(before, after)).toEqual([]);
    expect(
      diffDocs({ rows: [{ apiToken: "a", ok: 1 }] }, { rows: [{ apiToken: "b", ok: 1 }] }),
    ).toEqual([]);
  });

  it("redact drops sensitive paths that reach it anyway", () => {
    const changes = [
      { path: "user.password", before: "a", after: "b" },
      { path: "price", before: 1, after: 2 },
    ];
    expect(redact(changes)).toEqual([{ path: "price", before: 1, after: 2 }]);
    expect(isSensitivePath("seo.title")).toBe(false);
    expect(isSensitivePath("x.Hash")).toBe(true);
  });
});

describe("actionFor and describeActor (F-018 CA-3)", () => {
  const status: Change[] = [{ path: "status", before: "draft", after: "published" }];
  const price: Change[] = [{ path: "price", before: 1, after: 2 }];
  const cases: ["create" | "update" | "delete", Change[], string][] = [
    ["create", price, "create"],
    ["delete", price, "delete"],
    ["update", [...price, ...status], "status"],
    ["update", price, "update"],
  ];

  it.each(cases)("%s → %s", (operation, changes, expected) => {
    expect(actionFor(operation, changes)).toBe(expected);
  });

  it("an admin user, or System", () => {
    expect(describeActor({ id: 2, email: "admin@x.ch", hash: "h" })).toEqual({
      actorId: 2,
      actorEmail: "admin@x.ch",
    });
    expect(describeActor(null)).toEqual({ actorId: null, actorEmail: null });
    expect(describeActor({ id: "x" })).toEqual({ actorId: null, actorEmail: null });
  });
});
