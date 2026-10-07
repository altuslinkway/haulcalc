"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "New quote" },
  { href: "/settings", label: "My rates" },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-10 bg-stone-900 text-white">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-sm font-black">HC</span>
          HaulCalc
        </Link>
        <nav className="flex gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                pathname === l.href ? "bg-white/15 text-white" : "text-stone-300"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
