import type { Metadata, Viewport } from "next";
import "@fontsource/bungee/400.css";
import "@fontsource-variable/archivo/wdth.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bait Arena",
  description: "1v1 hot-take fights judged by AI. Post bait. Don't take the bait.",
};

export const viewport: Viewport = {
  themeColor: "#1a0f2e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
