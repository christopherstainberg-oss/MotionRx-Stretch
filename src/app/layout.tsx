import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { PwaRegister } from "@/components/PwaRegister";
import { DEFAULT_APP_NAME } from "@/data/names";

export const metadata: Metadata = {
  title: {
    default: `${DEFAULT_APP_NAME.name} — Clinical Stretching & Mobility`,
    template: `%s · ${DEFAULT_APP_NAME.name}`,
  },
  description:
    "Evidence-informed physical therapy stretching PWA: personalized routines, pain-aware progression, journal, progress tracking, and institutional instructional videos.",
  applicationName: DEFAULT_APP_NAME.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: DEFAULT_APP_NAME.name,
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#2c756f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Nav brandName={DEFAULT_APP_NAME.name} />
        <main className="mx-auto min-h-[70vh] max-w-6xl px-4 pb-28 pt-6 lg:pb-12">
          {children}
        </main>
        <footer className="border-t border-brand-100 bg-white/70 py-8 text-center text-sm text-brand-700/80">
          <p className="font-medium text-brand-900">{DEFAULT_APP_NAME.name}</p>
          <p className="mx-auto mt-1 max-w-xl px-4">
            Educational mobility support inspired by outpatient physical therapy principles. Not a
            substitute for personalized medical or PT care.
          </p>
          <p className="mt-3 text-xs text-brand-500">
            PWA · Offline library · Pain-aware self-adjust · Docker / ghcr.io ready
          </p>
        </footer>
        <PwaRegister />
      </body>
    </html>
  );
}
