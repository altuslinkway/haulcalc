"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useJobs } from "@/lib/client/jobsStore";

const tabs = [
  {
    href: "/quote",
    label: "Quote",
    icon: (
      <>
        <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
  },
  {
    href: "/jobs",
    label: "Jobs",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3" />
        <path d="M8 10h8M8 14h5" />
      </>
    ),
  },
  {
    href: "/settings",
    label: "My rates",
    icon: (
      <>
        <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="10" cy="17" r="2" />
      </>
    ),
  },
];

export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className={`flex items-center justify-center rounded-[10px] bg-accent font-display font-extrabold text-white ${
          size === "sm" ? "h-8 w-8 text-[13px]" : "h-9 w-9 text-sm"
        }`}
      >
        HC
      </span>
      <span className={`font-display font-bold tracking-tight ${size === "sm" ? "text-lg" : "text-xl"}`}>HaulCalc</span>
    </span>
  );
}

/** The app's frame on a phone: a slim top bar and the three tabs along the bottom. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Booked jobs are the ones waiting on the owner: mark them done once the work's finished.
  const waiting = useJobs().filter((j) => j.status === "booked").length;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-stone-200 bg-stone-100">
        <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-2.5">
          <Link href="/" aria-label="HaulCalc home" className="flex min-h-11 items-center">
            <Logo size="sm" />
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 pt-5 pb-32">{children}</main>

      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-20 bg-stone-900 pb-[max(env(safe-area-inset-bottom),12px)]"
      >
        <div className="mx-auto grid max-w-xl grid-cols-3 px-2 pt-2">
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[52px] flex-col items-center justify-center gap-1 text-xs ${
                  active ? "font-extrabold text-accent-bright" : "font-semibold text-stone-400"
                }`}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2.2 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {t.icon}
                </svg>
                {t.label}
                {t.href === "/jobs" && waiting > 0 && (
                  <span className="absolute top-1 left-[calc(50%+6px)] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-extrabold text-white ring-2 ring-stone-900">
                    <span className="sr-only">, booked: </span>
                    {waiting}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
