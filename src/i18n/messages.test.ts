import { describe, expect, it } from "vitest";

import de from "../../messages/de.json";
import en from "../../messages/en.json";
import es from "../../messages/es.json";

type Tree = { [key: string]: string | Tree };

/** "Namespace.key" → set of ICU argument names used in the message. */
function flatten(tree: Tree, prefix = ""): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      const args = [...value.matchAll(/\{\s*(\w+)/g)].map((m) => m[1] ?? "").sort();
      out.set(path, args);
    } else {
      for (const [k, v] of flatten(value, path)) out.set(k, v);
    }
  }
  return out;
}

const reference = flatten(en);

describe.each([
  ["de", de],
  ["es", es],
])("messages/%s.json", (_name, messages) => {
  const translated = flatten(messages);

  it("CA-7: has exactly the same keys as English", () => {
    expect([...translated.keys()].sort()).toEqual([...reference.keys()].sort());
  });

  it("CA-7: uses the same ICU arguments as English", () => {
    for (const [key, args] of reference) expect(translated.get(key), key).toEqual(args);
  });

  it("CA-7: has no empty messages", () => {
    for (const [key] of translated) {
      expect(
        key.split(".").reduce<unknown>((node, k) => (node as Tree)[k], messages),
        key,
      ).not.toBe("");
    }
  });
});
