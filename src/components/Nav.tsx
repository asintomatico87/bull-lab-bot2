"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/webhooks", label: "Log webhook" },
  { href: "/history", label: "Storico" },
  { href: "/setup", label: "Setup & Diagnostica" },
  { href: "/settings", label: "Impostazioni" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`relative whitespace-nowrap px-3 py-2.5 font-display text-[11px] font-bold uppercase tracking-[0.14em] transition-colors ${
              active ? "text-orange-300" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {l.label}
            <span
              className={`absolute inset-x-2 -bottom-px h-[2px] rounded-full ${
                active
                  ? "bg-gradient-to-r from-orange-400 via-amber-300 to-sky-400 shadow-[0_0_14px_2px_rgba(255,138,30,0.5)]"
                  : "bg-transparent"
              }`}
            />
          </Link>
        );
      })}
    </nav>
  );
}
