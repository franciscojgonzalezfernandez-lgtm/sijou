"use client";

import { useField } from "@payloadcms/ui";
import type { JSONFieldClientComponent } from "payload";

import type { Change } from "@/domain/audit/diff";

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(vacío)";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/**
 * An audit row's changes as a table (F-018 CA-3, constitution II) instead of Payload's JSON
 * editor: field, before and after, readable and announced as a table by screen readers.
 */
export const AuditChanges: JSONFieldClientComponent = ({ path }) => {
  const { value } = useField<Change[] | null>({ path });
  const changes = Array.isArray(value) ? value : [];

  return (
    <div className="field-type audit-changes">
      <table>
        <caption>Cambios</caption>
        <thead>
          <tr>
            <th scope="col">Campo</th>
            <th scope="col">Antes</th>
            <th scope="col">Después</th>
          </tr>
        </thead>
        <tbody>
          {changes.length === 0 ? (
            <tr>
              <td colSpan={3}>Sin cambios registrados.</td>
            </tr>
          ) : (
            changes.map((change) => (
              <tr key={change.path}>
                <th scope="row">{change.path}</th>
                <td>{show(change.before)}</td>
                <td>{show(change.after)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
