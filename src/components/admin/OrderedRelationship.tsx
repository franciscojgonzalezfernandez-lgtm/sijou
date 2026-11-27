"use client";

import { FieldDescription, FieldError, useConfig, useField } from "@payloadcms/ui";
import type { RelationshipFieldClientComponent } from "payload";
import { useEffect, useId, useState } from "react";

type Id = number | string;

function idOf(value: unknown): Id | undefined {
  if (typeof value === "number" || typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "id" in value) return idOf(value.id);
  return undefined;
}

/**
 * Hand-ordered many-to-many relationship (F-012 CA-4, constitution II): the chosen items as a
 * list with "Subir", "Bajar" and "Quitar" buttons, and a native select to add more. Works with
 * the keyboard alone, without dragging (WCAG 2.5.7).
 */
export const OrderedRelationship: RelationshipFieldClientComponent = ({
  field,
  path,
  readOnly,
}) => {
  const { value, setValue, showError, errorMessage } = useField<unknown[]>({ path });
  const { config } = useConfig();
  const [titles, setTitles] = useState<Map<Id, string> | null>(null);
  const [toAdd, setToAdd] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const legendId = useId();
  const selectId = useId();
  const relationTo = Array.isArray(field.relationTo) ? field.relationTo[0] : field.relationTo;
  const label = typeof field.label === "string" ? field.label : path;
  const chosen = (Array.isArray(value) ? value : []).map(idOf).filter((v) => v !== undefined);

  useEffect(() => {
    const controller = new AbortController();
    const collection = config.collections.find((c) => c.slug === relationTo);
    const titleField = collection?.admin?.useAsTitle ?? "id";
    const params = new URLSearchParams({
      limit: "500",
      depth: "0",
      locale: "es",
      sort: titleField,
    });
    // Same-origin path: the admin can be served from a different host than serverURL (previews).
    fetch(`${config.routes.api}/${relationTo}?${params.toString()}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<{ docs: Record<string, unknown>[] }>)
      .then(({ docs }) =>
        setTitles(
          new Map(
            docs.map((doc) => [
              doc.id as Id,
              typeof doc[titleField] === "string" ? doc[titleField] : `#${String(doc.id)}`,
            ]),
          ),
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) setTitles(new Map());
      });
    return () => controller.abort();
  }, [config, relationTo]);

  const title = (id: Id) => titles?.get(id) ?? `#${String(id)}`;

  function move(index: number, delta: -1 | 1) {
    const next = [...chosen];
    const [item] = next.splice(index, 1);
    if (item === undefined) return;
    next.splice(index + delta, 0, item);
    setValue(next);
    setAnnouncement(`${title(item)}: posición ${index + delta + 1} de ${next.length}.`);
  }

  function remove(index: number) {
    const item = chosen[index];
    setValue(chosen.filter((_, i) => i !== index));
    if (item !== undefined) setAnnouncement(`${title(item)} quitado.`);
  }

  function add() {
    const picked = [...(titles?.keys() ?? [])].find((id) => String(id) === toAdd);
    if (picked === undefined) return;
    setValue([...chosen, picked]);
    setToAdd("");
    setAnnouncement(`${title(picked)} añadido al final.`);
  }

  const available = [...(titles?.entries() ?? [])].filter(([id]) => !chosen.includes(id));

  return (
    <fieldset
      className={`field-type ordered-relationship${showError ? "error" : ""}`}
      aria-labelledby={legendId}
      disabled={readOnly}
    >
      <legend id={legendId} className="field-label">
        {label}
      </legend>
      <FieldError message={errorMessage} path={path} showError={showError} />
      {chosen.length === 0 ? (
        <p>Todavía no hay ninguno.</p>
      ) : (
        <ol className="ordered-relationship__list">
          {chosen.map((id, index) => (
            <li key={id} className="ordered-relationship__item">
              <span className="ordered-relationship__title">{title(id)}</span>
              <span className="ordered-relationship__actions">
                <button
                  type="button"
                  className="btn btn--style-secondary btn--size-small"
                  disabled={index === 0}
                  aria-label={`Subir ${title(id)}`}
                  onClick={() => move(index, -1)}
                >
                  Subir
                </button>
                <button
                  type="button"
                  className="btn btn--style-secondary btn--size-small"
                  disabled={index === chosen.length - 1}
                  aria-label={`Bajar ${title(id)}`}
                  onClick={() => move(index, 1)}
                >
                  Bajar
                </button>
                <button
                  type="button"
                  className="btn btn--style-secondary btn--size-small"
                  aria-label={`Quitar ${title(id)}`}
                  onClick={() => remove(index)}
                >
                  Quitar
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}
      <div className="ordered-relationship__add">
        <label htmlFor={selectId}>Añadir</label>
        <select
          id={selectId}
          className="native-select__input"
          value={toAdd}
          disabled={titles === null}
          onChange={(event) => setToAdd(event.target.value)}
        >
          <option value="">{titles === null ? "Cargando…" : "—"}</option>
          {available.map(([id, name]) => (
            <option key={id} value={String(id)}>
              {name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn--style-primary btn--size-small"
          disabled={!toAdd}
          onClick={add}
        >
          Añadir
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {field.admin?.description && (
        <FieldDescription description={field.admin.description} path={path} />
      )}
    </fieldset>
  );
};
