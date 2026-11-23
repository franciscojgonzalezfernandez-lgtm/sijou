import type { CollectionConfig } from "payload";

/** Shop administrators (Payload auth). Customers get their own accounts in F-007. */
export const Users: CollectionConfig = {
  slug: "users",
  admin: { useAsTitle: "email" },
  auth: true,
  fields: [],
};
