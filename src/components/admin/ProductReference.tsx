"use client";

import { FieldLabel, useConfig, useDocumentInfo, useField } from "@payloadcms/ui";
import type { RelationshipFieldClientComponent } from "payload";
import { useEffect, useState } from "react";

interface ProductOption {
  id: number;
  name: string;
}

function idOf(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value) return Number(value);
  if (typeof value === "object" && value !== null && "id" in value) return idOf(value.id);
  return undefined;
}

/**
 * A variant's product (F-011, constitution II) as a native, labelled <select>. Payload's
 * react-select widget leaves its input unlabelled and its icons focusable under aria-hidden.
 * Once the variant exists its product does not change: it shows as a link.
 */
export const ProductReference: RelationshipFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<unknown>({ path });
  const { id: documentId } = useDocumentInfo();
  const { config } = useConfig();
  const [products, setProducts] = useState<ProductOption[] | null>(null);
  const selected = idOf(value);
  const locked = documentId !== undefined && documentId !== null && selected !== undefined;
  const inputId = `field-${path.replace(/\./g, "__")}-input`;
  const errorId = `${inputId}-error`;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      limit: "500",
      depth: "0",
      sort: "name",
      locale: "es",
      "select[name]": "true",
    });
    if (locked) params.set("where[id][equals]", String(selected));
    // Same-origin path: the admin can be served from a different host than serverURL (previews).
    fetch(`${config.routes.api}/products?${params.toString()}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<{ docs: ProductOption[] }>)
      .then(({ docs }) => setProducts(docs))
      .catch(() => {
        if (!controller.signal.aborted) setProducts([]);
      });
    return () => controller.abort();
  }, [config.routes.api, locked, selected]);

  const label = typeof field.label === "string" ? field.label : "Producto";

  if (locked) {
    const product = products?.find((candidate) => candidate.id === selected);
    return (
      <div className="field-type product-reference">
        <p className="field-label">{label}</p>
        <a href={`${config.routes.admin}/collections/products/${selected}`}>
          {product?.name ?? `#${selected}`}
        </a>
      </div>
    );
  }

  return (
    <div className={`field-type select native-select${showError ? "error" : ""}`}>
      <FieldLabel htmlFor={inputId} label={field.label} path={path} required={field.required} />
      <div className="field-type__wrap">
        <select
          id={inputId}
          name={path}
          className="native-select__input"
          value={selected ?? ""}
          disabled={readOnly || products === null}
          required={field.required}
          aria-invalid={showError || undefined}
          aria-describedby={showError && errorMessage ? errorId : undefined}
          onChange={(event) => setValue(event.target.value ? Number(event.target.value) : null)}
        >
          <option value="">—</option>
          {(products ?? []).map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        {showError && errorMessage && (
          <p id={errorId} role="alert" className="native-select__error">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
};
