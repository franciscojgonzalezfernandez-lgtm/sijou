"use client";

import { useConfig } from "@payloadcms/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useId, useState } from "react";

import { AUDITED_ENTITIES } from "@/domain/audit/entities";

const SYSTEM = "__system";

/** Filter values from the list URL, so the form shows the filter that is applied. */
function current(params: URLSearchParams) {
  const day = (key: string) => params.get(key)?.slice(0, 10) ?? "";
  return {
    entity: params.get("where[entity][equals]") ?? "",
    actor:
      params.get("where[actorEmail][exists]") === "false"
        ? SYSTEM
        : (params.get("where[actorEmail][equals]") ?? ""),
    from: day("where[at][greater_than_equal]"),
    to: params.get("auditTo") ?? "",
  };
}

/** Midnight of a calendar day in the browser's time zone (the shop's, Zürich), as ISO. */
function startOf(day: string, offsetDays = 0): string {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString();
}

/**
 * Audit log filters (F-018 CA-4) with native, labelled controls: Payload's filter builder uses
 * react-select, which is not accessible (F-010). Builds the `where` query Payload's list reads.
 */
export function AuditFilters() {
  const params = useSearchParams().toString();
  // A new URL (filter applied, history link) starts the form over from that URL.
  return <FilterForm key={params} initial={current(new URLSearchParams(params))} />;
}

function FilterForm({ initial }: { initial: ReturnType<typeof current> }) {
  const { config } = useConfig();
  const router = useRouter();
  const pathname = usePathname();
  const base = useId();
  const [values, setValues] = useState(initial);
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    // Same-origin path: the admin can be served from a different host than serverURL (previews).
    fetch(`${config.routes.api}/users?limit=100&depth=0&sort=email&select[email]=true`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : { docs: [] }))
      .then(({ docs }: { docs: { email: string }[] }) => setUsers(docs.map((u) => u.email)))
      .catch(() => undefined);
    return () => controller.abort();
  }, [config.routes.api]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (values.entity) query.set("where[entity][equals]", values.entity);
    if (values.actor === SYSTEM) query.set("where[actorEmail][exists]", "false");
    else if (values.actor) query.set("where[actorEmail][equals]", values.actor);
    if (values.from) query.set("where[at][greater_than_equal]", startOf(values.from));
    if (values.to) {
      query.set("where[at][less_than]", startOf(values.to, 1));
      query.set("auditTo", values.to);
    }
    router.push(`${pathname}?${query.toString()}`);
  }

  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((previous) => ({ ...previous, [key]: event.target.value }));

  return (
    <form className="audit-filters" onSubmit={apply} aria-label="Filtrar la auditoría">
      <div className="audit-filters__field">
        <label htmlFor={`${base}-entity`}>Entidad</label>
        <select id={`${base}-entity`} value={values.entity} onChange={set("entity")}>
          <option value="">Todas</option>
          {Object.entries(AUDITED_ENTITIES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="audit-filters__field">
        <label htmlFor={`${base}-actor`}>Usuario</label>
        <select id={`${base}-actor`} value={values.actor} onChange={set("actor")}>
          <option value="">Todos</option>
          <option value={SYSTEM}>Sistema</option>
          {users.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>
      </div>
      <div className="audit-filters__field">
        <label htmlFor={`${base}-from`}>Desde</label>
        <input id={`${base}-from`} type="date" value={values.from} onChange={set("from")} />
      </div>
      <div className="audit-filters__field">
        <label htmlFor={`${base}-to`}>Hasta</label>
        <input id={`${base}-to`} type="date" value={values.to} onChange={set("to")} />
      </div>
      <div className="audit-filters__actions">
        <button type="submit" className="btn btn--style-primary btn--size-small">
          Filtrar
        </button>
        <button
          type="button"
          className="btn btn--style-secondary btn--size-small"
          onClick={() => router.push(pathname)}
        >
          Quitar filtros
        </button>
      </div>
    </form>
  );
}
