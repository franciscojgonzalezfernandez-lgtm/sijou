"use client";

import { useConfig, useDocumentInfo } from "@payloadcms/ui";
import type { UIFieldClientComponent } from "payload";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";

import { zurichToUtc } from "@/domain/catalog/zurich-time";
import {
  availableStock,
  expiredStock,
  isExpired,
  type Lot,
  zurichToday,
} from "@/domain/stock/lots";
import {
  type FieldError,
  MANUAL_REASONS,
  REASONS,
  REFERENCES,
  type Reason,
  type Reference,
} from "@/domain/stock/movements";

interface PanelLot extends Lot {
  quantityInitial: number;
}

interface Movement {
  id: number;
  at: string;
  lotId: number | null;
  lotCode: string | null;
  delta: number;
  quantityAfter: number;
  reason: Reason;
  refType: Reference;
  refId: string | null;
  comment: string | null;
  actorEmail: string | null;
}

interface Page {
  docs: Movement[];
  page: number;
  totalPages: number;
  totalDocs: number;
}

const DATE_TIME = new Intl.DateTimeFormat("es-CH", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Zurich",
});
const DAY = new Intl.DateTimeFormat("es-CH", { dateStyle: "short", timeZone: "UTC" });

const formatDay = (day: string) => DAY.format(new Date(`${day}T00:00:00Z`));
const units = (n: number) => `${n} ${n === 1 ? "unidad" : "unidades"}`;
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

function nextDay(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

/** A horizontally scrollable table that never widens the page (WCAG 1.4.10), keyboard-reachable. */
function Scroll({ label, children }: { label: string; children: ReactNode }) {
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- scrollable region must be focusable
    <div className="stock-panel__scroll" role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  /** Enter runs this form's action instead of saving the variant. */
  onEnter?: () => void;
  children: (props: {
    onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
    id: string;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
    "aria-required"?: boolean;
  }) => ReactNode;
}

function Field({ id, label, error, required, hint, onEnter: action, children }: FieldProps) {
  const describedBy = [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={`stock-panel__field${error ? "stock-panel__field--error" : ""}`}>
      <label htmlFor={id}>
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy || undefined,
        "aria-required": required || undefined,
        onKeyDown: action ? onEnter(action) : undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="stock-panel__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="stock-panel__error">
          {error}
        </p>
      )}
    </div>
  );
}

type Errors = Record<string, string>;

const toErrors = (list: FieldError[] | undefined): Errors =>
  Object.fromEntries((list ?? []).map((e) => [e.path, e.message]));

/** Our own forms live inside Payload's document form: Enter must not save the variant. */
function onEnter(action: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" && !(event.target instanceof HTMLTextAreaElement)) {
      event.preventDefault();
      action();
    }
  };
}

/**
 * The Stock block of a variant (F-013 CA-7): total, lots in FEFO order, registering a lot (HU-1),
 * manual adjustments (HU-2, CA-4) and the filterable history (HU-3). Every write goes through the
 * stock endpoints, which run in a transaction and record the movement.
 */
export const StockPanel: UIFieldClientComponent = () => {
  const { id } = useDocumentInfo();
  const { config } = useConfig();
  const api = config.routes.api;
  const uid = useId();
  const variantId = typeof id === "number" ? id : Number(id);

  const [lots, setLots] = useState<PanelLot[] | null>(null);
  const [history, setHistory] = useState<Page | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const [entry, setEntry] = useState({ code: "", quantity: "", expiresAt: "" });
  const [entryErrors, setEntryErrors] = useState<Errors>({});
  const [confirmExpired, setConfirmExpired] = useState(false);

  const [adjustment, setAdjustment] = useState({ lot: "", delta: "", reason: "", comment: "" });
  const [adjustErrors, setAdjustErrors] = useState<Errors>({});

  const [filters, setFilters] = useState({ lot: "", reason: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  /** Bumped after every write, so the lots and the history load again. */
  const [version, setVersion] = useState(0);
  const valid = Number.isFinite(variantId);

  /** The form whose first invalid field gets focus once the errors are on screen. */
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const fieldset = pendingFocus.current;
    if (!fieldset) return;
    pendingFocus.current = null;
    document.getElementById(fieldset)?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  });

  useEffect(() => {
    if (!valid) return;
    let live = true;
    void fetch(`${api}/lots/of/${variantId}`, { credentials: "include" })
      .then((response) => (response.ok ? (response.json() as Promise<{ lots: PanelLot[] }>) : null))
      .then((json) => {
        if (live && json) setLots(json.lots);
      });
    return () => {
      live = false;
    };
  }, [api, variantId, valid, version]);

  useEffect(() => {
    if (!valid) return;
    const query = new URLSearchParams({
      "where[variantId][equals]": String(variantId),
      sort: "-at",
      limit: "25",
      page: String(page),
      depth: "0",
    });
    if (filters.lot) query.set("where[lotId][equals]", filters.lot);
    if (filters.reason) query.set("where[reason][equals]", filters.reason);
    if (filters.from) {
      query.set("where[at][greater_than_equal]", zurichToUtc(`${filters.from}T00:00`) ?? "");
    }
    if (filters.to) {
      query.set("where[at][less_than]", zurichToUtc(`${nextDay(filters.to)}T00:00`) ?? "");
    }
    let live = true;
    void fetch(`${api}/stock-movements?${query.toString()}`, { credentials: "include" })
      .then((response) => (response.ok ? (response.json() as Promise<Page>) : null))
      .then((json) => {
        if (live && json) setHistory(json);
      });
    return () => {
      live = false;
    };
  }, [api, variantId, valid, page, filters, version]);

  if (!valid) {
    return (
      <section className="stock-panel" aria-labelledby={`${uid}-title`}>
        <h3 id={`${uid}-title`}>Stock</h3>
        <p>Guarda la variante para registrar su stock.</p>
      </section>
    );
  }

  const today = zurichToday();
  const focusFirstError = (fieldset: string) => {
    pendingFocus.current = fieldset;
  };

  async function post(path: string, data: unknown) {
    const response = await fetch(`${api}/lots${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = (await response.json().catch(() => ({}))) as { errors?: FieldError[] };
    return { ok: response.ok, errors: json.errors };
  }

  async function register() {
    const expired = entry.expiresAt !== "" && entry.expiresAt < today;
    if (expired && !confirmExpired) {
      setConfirmExpired(true);
      setStatus(
        "Este lote ya está caducado: se registrará, pero no se venderá. Confirma para seguir.",
      );
      return;
    }
    setBusy(true);
    const result = await post("/receive", {
      variant: variantId,
      code: entry.code,
      quantity: entry.quantity === "" ? null : Number(entry.quantity),
      expiresAt: entry.expiresAt,
    });
    setBusy(false);
    if (!result.ok) {
      setEntryErrors(toErrors(result.errors));
      setStatus("No se ha registrado el lote: revisa los campos marcados.");
      focusFirstError(`${uid}-entry`);
      return;
    }
    setStatus(
      `Lote ${entry.code.trim()} registrado con ${units(Number(entry.quantity))}${
        expired ? ", caducado: no se venderá" : ""
      }.`,
    );
    setEntry({ code: "", quantity: "", expiresAt: "" });
    setEntryErrors({});
    setConfirmExpired(false);
    setVersion((v) => v + 1);
  }

  async function adjust() {
    if (!adjustment.lot) {
      setAdjustErrors({ lot: "Elige el lote." });
      setStatus("No se ha guardado el ajuste: revisa los campos marcados.");
      focusFirstError(`${uid}-adjust`);
      return;
    }
    setBusy(true);
    const result = await post(`/${adjustment.lot}/adjust`, {
      delta: adjustment.delta === "" ? null : Number(adjustment.delta),
      reason: adjustment.reason,
      comment: adjustment.comment,
    });
    setBusy(false);
    if (!result.ok) {
      setAdjustErrors(toErrors(result.errors));
      setStatus("No se ha guardado el ajuste: revisa los campos marcados.");
      focusFirstError(`${uid}-adjust`);
      return;
    }
    const code = lots?.find((l) => String(l.id) === adjustment.lot)?.code ?? "";
    setStatus(`Ajuste guardado: ${signed(Number(adjustment.delta))} en el lote ${code}.`);
    setAdjustment({ lot: adjustment.lot, delta: "", reason: "", comment: "" });
    setAdjustErrors({});
    setVersion((v) => v + 1);
  }

  const onRegister = () => void register();
  const onAdjust = () => void adjust();
  const ignoreEnter = () => undefined;

  const available = lots ? availableStock(lots, today) : 0;
  const expired = lots ? expiredStock(lots, today) : 0;

  return (
    <section className="stock-panel" aria-labelledby={`${uid}-title`}>
      <h3 id={`${uid}-title`}>Stock</h3>
      <p className="stock-panel__summary">
        Stock disponible: <strong>{lots ? available : "…"}</strong>
        {expired > 0 && ` (+ ${units(expired)} caducadas, no se venden)`}
      </p>

      <div role="status" className="stock-panel__status">
        {status}
      </div>

      <h4>Lotes</h4>
      {lots && lots.length === 0 && <p>Esta variante todavía no tiene lotes.</p>}
      {lots && lots.length > 0 && (
        <Scroll label="Lotes">
          <table className="stock-panel__table">
            <caption>Lotes, en el orden en que se venden (primero el que caduca antes)</caption>
            <thead>
              <tr>
                <th scope="col">Lote</th>
                <th scope="col">Caducidad</th>
                <th scope="col">Entrada</th>
                <th scope="col">Disponible</th>
                <th scope="col">Inicial</th>
              </tr>
            </thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id}>
                  <th scope="row">{lot.code}</th>
                  <td>
                    {lot.expiresAt ? formatDay(lot.expiresAt) : "Sin caducidad"}
                    {isExpired(lot, today) && (
                      <strong className="stock-panel__expired"> Caducado</strong>
                    )}
                  </td>
                  <td>{DATE_TIME.format(new Date(lot.receivedAt))}</td>
                  <td>{lot.quantityAvailable}</td>
                  <td>{lot.quantityInitial}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scroll>
      )}

      <div className="stock-panel__forms">
        <fieldset id={`${uid}-entry`}>
          <legend>Registrar lote</legend>
          <Field
            id={`${uid}-code`}
            onEnter={onRegister}
            label="Código de lote"
            required
            error={entryErrors.code}
          >
            {(props) => (
              <input
                {...props}
                type="text"
                autoComplete="off"
                value={entry.code}
                onChange={(e) => setEntry({ ...entry, code: e.target.value })}
              />
            )}
          </Field>
          <Field
            id={`${uid}-quantity`}
            onEnter={onRegister}
            label="Cantidad"
            required
            error={entryErrors.quantity}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                value={entry.quantity}
                onChange={(e) => setEntry({ ...entry, quantity: e.target.value })}
              />
            )}
          </Field>
          <Field
            id={`${uid}-expires`}
            onEnter={onRegister}
            label="Caducidad"
            hint="Opcional. Se vende hasta ese día incluido."
            error={entryErrors.expiresAt}
          >
            {(props) => (
              <input
                {...props}
                type="date"
                value={entry.expiresAt}
                onChange={(e) => {
                  setEntry({ ...entry, expiresAt: e.target.value });
                  setConfirmExpired(false);
                }}
              />
            )}
          </Field>
          <button
            type="button"
            className="btn btn--style-secondary"
            disabled={busy}
            onClick={() => void register()}
          >
            {confirmExpired ? "Registrar igualmente" : "Registrar lote"}
          </button>
        </fieldset>

        <fieldset id={`${uid}-adjust`} disabled={!lots?.length}>
          <legend>Ajustar stock</legend>
          <Field
            id={`${uid}-lot`}
            onEnter={onAdjust}
            label="Lote"
            required
            error={adjustErrors.lot}
          >
            {(props) => (
              <select
                {...props}
                value={adjustment.lot}
                onChange={(e) => setAdjustment({ ...adjustment, lot: e.target.value })}
              >
                <option value="">Elige un lote</option>
                {lots?.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.code} ({units(lot.quantityAvailable)})
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            id={`${uid}-delta`}
            onEnter={onAdjust}
            label="Cantidad"
            required
            hint="En positivo si entra, en negativo si sale (por ejemplo, -2)."
            error={adjustErrors.delta}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                step={1}
                value={adjustment.delta}
                onChange={(e) => setAdjustment({ ...adjustment, delta: e.target.value })}
              />
            )}
          </Field>
          <Field
            id={`${uid}-reason`}
            onEnter={onAdjust}
            label="Motivo"
            required
            error={adjustErrors.reason}
          >
            {(props) => (
              <select
                {...props}
                value={adjustment.reason}
                onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
              >
                <option value="">Elige un motivo</option>
                {MANUAL_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {REASONS[reason]}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            id={`${uid}-comment`}
            onEnter={onAdjust}
            label="Comentario"
            required={adjustment.reason === "other"}
            hint="Obligatorio con el motivo «Otro»."
            error={adjustErrors.comment}
          >
            {(props) => (
              <textarea
                {...props}
                rows={2}
                value={adjustment.comment}
                onChange={(e) => setAdjustment({ ...adjustment, comment: e.target.value })}
              />
            )}
          </Field>
          <button
            type="button"
            className="btn btn--style-secondary"
            disabled={busy}
            onClick={() => void adjust()}
          >
            Guardar ajuste
          </button>
        </fieldset>
      </div>

      <h4>Historial</h4>
      <fieldset className="stock-panel__filters">
        <legend>Filtrar el historial</legend>
        <Field id={`${uid}-f-lot`} onEnter={ignoreEnter} label="Lote">
          {(props) => (
            <select
              {...props}
              value={filters.lot}
              onChange={(e) => {
                setFilters({ ...filters, lot: e.target.value });
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {lots?.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.code}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id={`${uid}-f-reason`} onEnter={ignoreEnter} label="Motivo">
          {(props) => (
            <select
              {...props}
              value={filters.reason}
              onChange={(e) => {
                setFilters({ ...filters, reason: e.target.value });
                setPage(1);
              }}
            >
              <option value="">Todos</option>
              {(Object.keys(REASONS) as Reason[]).map((reason) => (
                <option key={reason} value={reason}>
                  {REASONS[reason]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id={`${uid}-f-from`} onEnter={ignoreEnter} label="Desde">
          {(props) => (
            <input
              {...props}
              type="date"
              value={filters.from}
              onChange={(e) => {
                setFilters({ ...filters, from: e.target.value });
                setPage(1);
              }}
            />
          )}
        </Field>
        <Field id={`${uid}-f-to`} onEnter={ignoreEnter} label="Hasta">
          {(props) => (
            <input
              {...props}
              type="date"
              value={filters.to}
              onChange={(e) => {
                setFilters({ ...filters, to: e.target.value });
                setPage(1);
              }}
            />
          )}
        </Field>
      </fieldset>

      {history && history.totalDocs === 0 && <p>No hay movimientos con estos filtros.</p>}
      {history && history.totalDocs > 0 && (
        <>
          <Scroll label="Historial de movimientos">
            <table className="stock-panel__table">
              <caption>Movimientos, del más reciente al más antiguo</caption>
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Lote</th>
                  <th scope="col">Cantidad</th>
                  <th scope="col">Queda</th>
                  <th scope="col">Motivo</th>
                  <th scope="col">Referencia</th>
                  <th scope="col">Quién</th>
                </tr>
              </thead>
              <tbody>
                {history.docs.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <time dateTime={m.at}>{DATE_TIME.format(new Date(m.at))}</time>
                    </td>
                    <td>{m.lotCode ?? "—"}</td>
                    <td>{signed(m.delta)}</td>
                    <td>{m.quantityAfter}</td>
                    <td>
                      {REASONS[m.reason]}
                      {m.comment && <span className="stock-panel__comment">: {m.comment}</span>}
                    </td>
                    <td>
                      {REFERENCES[m.refType]}
                      {m.refType === "order" && m.refId ? ` ${m.refId}` : ""}
                    </td>
                    <td>{m.actorEmail ?? "Sistema"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
          {history.totalPages > 1 && (
            <nav className="stock-panel__pages" aria-label="Páginas del historial">
              <button
                type="button"
                className="btn btn--style-secondary btn--size-small"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Anterior
              </button>
              <span>
                Página {history.page} de {history.totalPages}
              </span>
              <button
                type="button"
                className="btn btn--style-secondary btn--size-small"
                disabled={page >= history.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
};
