import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sijou — Natural cosmetics",
  description:
    "Sijou natural cosmetics. Our online shop is coming soon, with handmade products shipped from Switzerland.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
