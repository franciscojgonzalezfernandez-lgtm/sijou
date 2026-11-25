import { ImageResponse } from "next/og";

import { sprigIconSvg } from "@/components/brand/sprig";

// F-004 CA-10: home-screen icon, the sprig in linen on olive. iOS rounds the corners itself.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const svg = sprigIconSvg({ fg: "#FBFAF8", bg: "#4A552F", radius: 0 });

export default function AppleIcon() {
  return new ImageResponse(
    <img
      alt=""
      width={180}
      height={180}
      src={`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`}
    />,
    size,
  );
}
