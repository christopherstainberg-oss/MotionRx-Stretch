import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { DEFAULT_APP_NAME } from "@/data/names";

export const metadata: Metadata = {
  title: {
    default: `${DEFAULT_APP_NAME.name} — Clinical Stretching & Mobility`,
    template: `%s · ${DEFAULT_APP_NAME.name}`,
  },
  description:
    "MotionRx Stretch: prescribed motion for real life. Clinically inspired stretching and exercise plans, pain-aware progression, Jeffery AI coach, journal, and progress tracking.",
  applicationName: DEFAULT_APP_NAME.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MotionRx",
  },
  formatDetection: { telephone: false },
  other: {
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2c756f" },
    { media: "(prefers-color-scheme: dark)", color: "#1f413f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
