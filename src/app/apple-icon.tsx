import { ImageResponse } from "next/og";

import { MARK_PATHS } from "@/components/brand/logo";

// F-004 CA-10: home-screen icon, linen "M" on olive. Rendered once at build time.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const mark = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="#FBFAF8">${MARK_PATHS.map((d) => `<path d="${d}"/>`).join("")}</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#4A552F",
      }}
    >
      {}
      <img
        alt=""
        width={128}
        height={128}
        src={`data:image/svg+xml;utf8,${encodeURIComponent(mark)}`}
      />
    </div>,
    size,
  );
}
