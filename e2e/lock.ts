import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";

const LOCK_DIR = path.join(import.meta.dirname, "../playwright/.locks");
/** A lock older than this belongs to a crashed worker. */
const STALE_MS = 5 * 60_000;

/**
 * Runs `fn` while no other Playwright worker holds the lock `name`. For tests that edit shared
 * singletons (the settings global): the device projects run in parallel and would overwrite each
 * other's values half-way through.
 */
export async function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  await mkdir(LOCK_DIR, { recursive: true });
  const lock = path.join(LOCK_DIR, name);
  for (;;) {
    try {
      await mkdir(lock);
      break;
    } catch {
      const age = await stat(lock).then(
        (s) => Date.now() - s.mtimeMs,
        () => 0,
      );
      if (age > STALE_MS) await rm(lock, { recursive: true, force: true });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  try {
    return await fn();
  } finally {
    await rm(lock, { recursive: true, force: true });
  }
}
