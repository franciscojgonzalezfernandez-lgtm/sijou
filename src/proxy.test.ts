import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import proxy from "./proxy";

function request(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(new URL(path, "https://shop.test"), {
    headers: { "sec-fetch-dest": "document", ...headers },
  });
}

function redirectTarget(response: Response) {
  const location = response.headers.get("location");
  return location ? new URL(location).pathname : null;
}

describe("proxy: language negotiation", () => {
  it("CA-2: redirects / to the browser language", () => {
    const res = proxy(request("/", { "accept-language": "de-CH,de;q=0.9,en;q=0.8" }));
    expect(res.status).toBe(307);
    expect(redirectTarget(res)).toBe("/de");
  });

  it("CA-2: respects weights in Accept-Language", () => {
    const res = proxy(request("/", { "accept-language": "fr;q=1, es;q=0.8, en;q=0.5" }));
    expect(redirectTarget(res)).toBe("/es");
  });

  it("CA-2: an unsupported browser language falls back to English", () => {
    expect(redirectTarget(proxy(request("/", { "accept-language": "fr-FR" })))).toBe("/en");
  });

  it("CA-3: the locale cookie wins over the browser language", () => {
    const res = proxy(request("/", { "accept-language": "de", cookie: "NEXT_LOCALE=es" }));
    expect(redirectTarget(res)).toBe("/es");
  });

  it("CA-3: an invalid cookie is ignored", () => {
    const res = proxy(request("/", { "accept-language": "de", cookie: "NEXT_LOCALE=xx" }));
    expect(redirectTarget(res)).toBe("/de");
  });

  it("CA-9: a crawler without Accept-Language gets English", () => {
    expect(redirectTarget(proxy(request("/")))).toBe("/en");
  });

  it("CA-9: prefixed URLs are never redirected (no loops)", () => {
    const res = proxy(request("/de", { "accept-language": "es" }));
    expect(res.headers.get("location")).toBeNull();
  });

  it("CA-1: unprefixed paths get a prefix", () => {
    expect(redirectTarget(proxy(request("/about", { "accept-language": "es" })))).toBe("/es/about");
  });

  it("CA-4: visiting another language stores the choice in the cookie", () => {
    const res = proxy(request("/es", { "accept-language": "en" }));
    expect(res.headers.get("set-cookie")).toMatch(/NEXT_LOCALE=es/);
  });

  it("CA-4: background requests (prefetch) never change the cookie", () => {
    const res = proxy(request("/es", { "accept-language": "en", "sec-fetch-dest": "empty" }));
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
