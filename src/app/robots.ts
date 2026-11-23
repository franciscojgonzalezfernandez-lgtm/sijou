import type { MetadataRoute } from "next";

// F-002 CA-8: keep the admin panel and the API out of search engines.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
  };
}
