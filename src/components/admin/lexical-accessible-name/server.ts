import { createServerFeature } from "@payloadcms/richtext-lexical";

/** Server side of the editor accessible-name fix (see ./client.tsx). */
export const AccessibleNameFeature = createServerFeature({
  feature: {
    ClientFeature: "/components/admin/lexical-accessible-name/client#AccessibleNameClientFeature",
  },
  key: "accessibleName",
});
