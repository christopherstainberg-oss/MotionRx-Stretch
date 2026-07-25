"use client";

import { usePathname } from "next/navigation";
import { Nav } from "@/components/Nav";
import { PwaRegister } from "@/components/PwaRegister";
import { OfflineBanner } from "@/components/OfflineBanner";
import { DEFAULT_APP_NAME } from "@/data/names";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthScreen = pathname === "/login" || pathname === "/";

  if (isAuthScreen) {
    return (
      <div className="flex min-h-dvh flex-col">
        <OfflineBanner />
        <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <PwaRegister />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <OfflineBanner />
      <Nav brandName={DEFAULT_APP_NAME.name} />
      <main
        id="main-content"
        tabIndex={-1}
        className="page page-pad mx-auto w-full flex-1 outline-none"
        style={{
          paddingTop: "1.25rem",
          /* room for bottom tab bar + home indicator on phones */
          paddingBottom: "calc(var(--tabbar-h) + var(--safe-bottom) + 1.25rem)",
        }}
      >
        <div className="pb-6 lg:pb-10 xl:pb-8">{children}</div>
      </main>
      <footer
        className="mt-auto hidden border-t border-brand-100/80 bg-white/70 py-8 text-center text-sm text-brand-700/80 xl:block"
        style={{
          paddingLeft: "max(1rem, var(--safe-left))",
          paddingRight: "max(1rem, var(--safe-right))",
          paddingBottom: "max(2rem, var(--safe-bottom))",
        }}
      >
        <p className="font-semibold text-brand-900">{DEFAULT_APP_NAME.name}</p>
        <p className="mx-auto mt-1 max-w-xl px-4 leading-relaxed">
          Educational mobility support inspired by outpatient physical therapy principles. Not a
          substitute for personalized medical or PT care.
        </p>
        <p className="mt-3 text-xs text-brand-500">
          Installable PWA · Offline-ready · Pain-aware self-adjust · Jeffery AI coach
        </p>
      </footer>
      <PwaRegister />
    </div>
  );
}
