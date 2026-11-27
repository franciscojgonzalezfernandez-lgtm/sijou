import { describe, expect, it, vi } from "vitest";
import { parseServerEnv, trustedOrigins } from "./env";

const valid = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/sijou",
  PAYLOAD_SECRET: "x".repeat(32),
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
};

describe("parseServerEnv", () => {
  it("CA-6: accepts a complete environment", () => {
    expect(parseServerEnv(valid)).toEqual(valid);
  });

  it("CA-6: names the missing variable", () => {
    const { PAYLOAD_SECRET: _omit, ...rest } = valid;
    expect(() => parseServerEnv(rest)).toThrow(/PAYLOAD_SECRET: missing/);
  });

  it("CA-6: names every missing variable at once", () => {
    let message = "";
    try {
      parseServerEnv({});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/DATABASE_URL: missing/);
    expect(message).toMatch(/PAYLOAD_SECRET: missing/);
    expect(message).toMatch(/NEXT_PUBLIC_SITE_URL: missing/);
  });

  it("CA-6: treats an empty value as missing", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "" })).toThrow(/DATABASE_URL: missing/);
  });

  it("CA-6: rejects invalid values with the reason", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "mysql://x/y" })).toThrow(
      /DATABASE_URL: /,
    );
    expect(() => parseServerEnv({ ...valid, PAYLOAD_SECRET: "short" })).toThrow(
      /PAYLOAD_SECRET: must be at least 32 characters/,
    );
  });

  it("CA-6: derives the site URL from VERCEL_URL on previews", () => {
    const { NEXT_PUBLIC_SITE_URL: _omit, ...rest } = valid;
    expect(
      parseServerEnv({ ...rest, VERCEL_URL: "sijou-git-x.vercel.app" }).NEXT_PUBLIC_SITE_URL,
    ).toBe("https://sijou-git-x.vercel.app");
  });

  it("uses the production domain, not the deployment host, in production", () => {
    const { NEXT_PUBLIC_SITE_URL: _omit, ...rest } = valid;
    expect(
      parseServerEnv({
        ...rest,
        VERCEL_ENV: "production",
        VERCEL_URL: "sijou-abc123-team.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "sijou-nu.vercel.app",
      }).NEXT_PUBLIC_SITE_URL,
    ).toBe("https://sijou-nu.vercel.app");
  });

  it("ignores the production domain on previews", () => {
    const { NEXT_PUBLIC_SITE_URL: _omit, ...rest } = valid;
    expect(
      parseServerEnv({
        ...rest,
        VERCEL_ENV: "preview",
        VERCEL_URL: "sijou-git-x.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "sijou-nu.vercel.app",
      }).NEXT_PUBLIC_SITE_URL,
    ).toBe("https://sijou-git-x.vercel.app");
  });

  it("CA-6: an explicit site URL wins over VERCEL_URL", () => {
    expect(parseServerEnv({ ...valid, VERCEL_URL: "other.vercel.app" }).NEXT_PUBLIC_SITE_URL).toBe(
      valid.NEXT_PUBLIC_SITE_URL,
    );
  });
});

describe("trustedOrigins", () => {
  it("trusts the site URL and every Vercel host of the deployment", () => {
    expect(
      trustedOrigins(
        {
          VERCEL_PROJECT_PRODUCTION_URL: "sijou-nu.vercel.app",
          VERCEL_BRANCH_URL: "sijou-git-main-team.vercel.app",
          VERCEL_URL: "sijou-abc123-team.vercel.app",
        },
        "https://sijou-nu.vercel.app/",
      ),
    ).toEqual([
      "https://sijou-nu.vercel.app",
      "https://sijou-git-main-team.vercel.app",
      "https://sijou-abc123-team.vercel.app",
    ]);
  });

  it("trusts only the site URL outside Vercel", () => {
    expect(trustedOrigins({}, "http://localhost:3100")).toEqual(["http://localhost:3100"]);
  });
});

describe("serverEnv", () => {
  it("CA-6: reads process.env once and caches the result", async () => {
    vi.resetModules();
    for (const [key, value] of Object.entries(valid)) vi.stubEnv(key, value);
    const { serverEnv } = await import("./env");
    const first = serverEnv();
    vi.stubEnv("PAYLOAD_SECRET", "");
    expect(serverEnv()).toBe(first);
    vi.unstubAllEnvs();
  });
});
