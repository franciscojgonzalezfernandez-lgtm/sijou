import { describe, expect, it } from "vitest";
import { withExplicitSslMode } from "./db-url";

describe("withExplicitSslMode", () => {
  it.each(["prefer", "require", "verify-ca"])("spells out verify-full for sslmode=%s", (mode) => {
    expect(
      withExplicitSslMode(
        `postgresql://u:p@host.neon.tech/db?sslmode=${mode}&channel_binding=require`,
      ),
    ).toBe("postgresql://u:p@host.neon.tech/db?sslmode=verify-full&channel_binding=require");
  });

  it("leaves URLs without sslmode untouched (local Docker database)", () => {
    const local = "postgresql://sijou:sijou@localhost:54329/sijou";
    expect(withExplicitSslMode(local)).toBe(local);
  });

  it("leaves other modes untouched", () => {
    const url = "postgresql://u:p@h/db?sslmode=disable";
    expect(withExplicitSslMode(url)).toBe(url);
  });
});
