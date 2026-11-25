import { sprigIconSvg } from "@/components/brand/sprig";

// F-004 CA-10: favicon, the olive sprig in forest green on linen. Static, built once.
export const contentType = "image/svg+xml";

export default function Icon() {
  return new Response(sprigIconSvg({ fg: "#33421E", bg: "#F6F4F1", radius: 12 }), {
    headers: { "Content-Type": contentType },
  });
}
