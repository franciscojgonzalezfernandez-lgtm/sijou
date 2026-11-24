"use client";

import { createClientFeature } from "@payloadcms/richtext-lexical/client";
import { useLexicalComposerContext } from "@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext";
import { useEffect, useId } from "react";

/**
 * Gives the Lexical editable area the name of its field label (F-010, constitution II).
 * Payload renders `role="textbox"` without aria-label or aria-labelledby (axe: aria-input-field-name).
 */
function AccessibleNamePlugin() {
  const [editor] = useLexicalComposerContext();
  const fallbackId = useId();

  useEffect(
    () =>
      editor.registerRootListener((root) => {
        if (!root) return;
        const label = root.closest(".field-type")?.querySelector("label");
        if (label) {
          if (!label.id) label.id = `${fallbackId}-label`;
          root.setAttribute("aria-labelledby", label.id);
        }
        root.setAttribute("aria-multiline", "true");
      }),
    [editor, fallbackId],
  );

  return null;
}

export const AccessibleNameClientFeature = createClientFeature({
  plugins: [{ Component: AccessibleNamePlugin, position: "normal" }],
});
