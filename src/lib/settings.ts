import "server-only";

import config from "@payload-config";
import { cacheLife, cacheTag } from "next/cache";
import { getPayload } from "payload";

import { resolveSettings, type Settings } from "@/domain/settings/settings";
import { SETTINGS_TAG } from "@/globals/Settings";

/** Shop settings with defaults applied (F-018). Cached until the settings are saved. */
export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("max");

  const payload = await getPayload({ config });
  const raw = await payload.findGlobal({ slug: "settings", depth: 0 });
  return resolveSettings(raw);
}
