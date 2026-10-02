"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const PRIMARY_NAV = [
  { href: "/arsenal", label: "Arsenal" },
  { href: "/guide", label: "Guide" },
  { href: "/router", label: "Router" },
  { href: "/simulate", label: "Simulate" },
  { href: "/pathway", label: "Pathway" },
  { href: "/discover", label: "Discover" },
  { href: "/welcome", label: "Welcome" },
  { href: "/fees", label: "Fees" },
  { href: "/settings", label: "Settings" },
] as const;

const SECONDARY_NAV = [
  { href: "/coverage", label: "Coverage" },
  { href: "/optimize", label: "Optimize" },
  { href: "/benefits", label: "Benefits" },
  { href: "/compare", label: "Compare" },
  { href: "/calendar", label: "Calendar" },
  { href: "/buy", label: "Buy" },
  { href: "/timeline", label: "Timeline" },
  { href: "/renewal", label: "Renewal" },
  { href: "/spending", label: "Spending" },
  { href: "/admin", label: "Admin" },
] as const;

const SHELL_SKIP = new Set(["/", "/onboarding"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const skip = SHELL_SKIP.has(pathname);

  if (skip) {
    return <>{children}</>;
  }

  return (
    <div className="app-atmosphere flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line glass-panel">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/arsenal"
            className="font-display text-lg font-bold tracking-tight text-bone shrink-0"
          >
            Arsenal
          </Link>
          <nav
            className="flex flex-1 gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Main"
          >
            {PRIMARY_NAV.map(({ href, label }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium transition sm:px-3 sm:text-sm",
                    active
                      ? "bg-signal/15 text-signal"
                      : "text-bone-muted hover:bg-panel-hover hover:text-bone"
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>

      <footer className="border-t border-line px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <nav
            className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-bone-muted"
            aria-label="Secondary"
          >
            {SECONDARY_NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "hover:text-signal transition",
                  pathname === href && "text-signal"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="space-y-2 text-xs leading-relaxed text-bone-dim">
            <p>
              <strong className="font-medium text-bone-muted">Not financial advice.</strong>{" "}
              Arsenal estimates rewards using your spending inputs and point valuations you
              can edit. We never ask for card numbers, CVV, or SSN. Issuer terms change —
              verify offers before you apply.
            </p>
            <p>
              Valuations are illustrative (e.g. cents-per-point assumptions shown in-app).
              Actual redemption value varies by transfer partner, availability, and taxes/fees.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
