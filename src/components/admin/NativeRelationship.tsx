"use client";

import { FieldDescription, FieldLabel, useConfig, useDocumentInfo, useField } from "@payloadcms/ui";
import type { RelationshipFieldClientComponent } from "payload";
import { useEffect, useState } from "react";

type Id = number | string;

interface Option {
  id: Id;
  title: string;
  parent: Id | null;
}

function idOf(value: unknown): Id | null {
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "id" in value) return idOf(value.id);
  return null;
}

/** The document and everything under it, from the options' parent links. */
function branchOf(options: Option[], root: Id): Set<Id> {
  const branch = new Set<Id>([root]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const option of options) {
      if (option.parent !== null && branch.has(option.parent) && !branch.has(option.id)) {
        branch.add(option.id);
        grew = true;
      }
    }
  }
  return branch;
}

/**
 * Single relationship as a native, labelled <select> (F-012, constitution II), for short lists
 * such as categories. `admin.custom.titleField` picks the label (e.g. the virtual breadcrumb);
 * `admin.custom.excludeBranch` leaves out the document itself and its descendants. The server
 * still validates: this only keeps impossible choices off the list.
 */
export const NativeRelationship: RelationshipFieldClientComponent = ({ field, path, readOnly }) => {
  const { value, setValue, showError, errorMessage } = useField<unknown>({ path });
  const { config } = useConfig();
  const { id: documentId } = useDocumentInfo();
  const [options, setOptions] = useState<Option[] | null>(null);
  const relationTo = Array.isArray(field.relationTo) ? field.relationTo[0] : field.relationTo;
  const custom = field.admin?.custom as
    { excludeBranch?: boolean; titleField?: string } | undefined;
  const id = `field-${path.replace(/\./g, "__")}-input`;
  const errorId = `${id}-error`;
  const descriptionId = `${id}-description`;
  const description = field.admin?.description;

  useEffect(() => {
    const controller = new AbortController();
    const collection = config.collections.find((c) => c.slug === relationTo);
    const titleField = custom?.titleField ?? collection?.admin?.useAsTitle ?? "id";
    const params = new URLSearchParams({ limit: "500", depth: "0", locale: "es" });
    // Same-origin path: the admin can be served from a different host than serverURL (previews).
    fetch(`${config.routes.api}/${relationTo}?${params.toString()}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<{ docs: Record<string, unknown>[] }>)
      .then(({ docs }) =>
        setOptions(
          docs
            .map((doc) => ({
              id: doc.id as Id,
              title:
                typeof doc[titleField] === "string" && doc[titleField]
                  ? doc[titleField]
                  : `#${String(doc.id)}`,
              parent: idOf(doc.parent),
            }))
            .sort((a, b) => a.title.localeCompare(b.title, "es")),
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) setOptions([]);
      });
    return () => controller.abort();
  }, [config, relationTo, custom?.titleField]);

  const excluded =
    custom?.excludeBranch && options && documentId !== undefined && documentId !== null
      ? branchOf(options, documentId)
      : new Set<Id>();
  const current = idOf(value);

  return (
    <div className={`field-type select native-select${showError ? "error" : ""}`}>
      <FieldLabel htmlFor={id} label={field.label} path={path} required={field.required} />
      <div className="field-type__wrap">
        <select
          id={id}
          name={path}
          className="native-select__input"
          value={current === null ? "" : String(current)}
          disabled={readOnly || options === null}
          aria-invalid={showError || undefined}
          aria-describedby={
            [showError && errorMessage ? errorId : "", description ? descriptionId : ""]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onChange={(event) => {
            const picked = options?.find((o) => String(o.id) === event.target.value);
            setValue(picked ? picked.id : null);
          }}
        >
          <option value="">{options === null ? "Cargando…" : "—"}</option>
          {options
            ?.filter((option) => !excluded.has(option.id))
            .map((option) => (
              <option key={option.id} value={String(option.id)}>
                {option.title}
              </option>
            ))}
        </select>
        {showError && errorMessage && (
          <p id={errorId} role="alert" className="native-select__error">
            {errorMessage}
          </p>
        )}
      </div>
      {description && (
        <div id={descriptionId}>
          <FieldDescription description={description} path={path} />
        </div>
      )}
    </div>
  );
};
