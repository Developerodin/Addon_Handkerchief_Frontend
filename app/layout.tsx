import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.scss";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Addon Handkerchief",
  description: "Addon Handkerchief",
  applicationName: "Addon Handkerchief",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Addon",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#845ADF",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Script src="/pwa-capture.js" strategy="beforeInteractive" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
