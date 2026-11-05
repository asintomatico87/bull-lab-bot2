import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { Nav } from "@/components/Nav";
import { ModeBadge } from "@/components/ui";
import { getSettings } from "@/lib/settings";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bull Lab Trading System",
  description: "VAPI Ladder 3H · BTC/ETH — webhook TradingView → Hyperliquid (paper/live)",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  let mode = "paper";
  let kill = false;
  try {
    const s = await getSettings();
    mode = s.mode;
    kill = s.killSwitch;
  } catch {
    // DB non raggiungibile: le pagine mostrano l'errore specifico
  }

  return (
    <html lang="it">
      <body className="min-h-screen text-slate-100 antialiased">
        <div className="relative z-10">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#04060b]/80 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 pt-4">
              <div className="flex items-center gap-4">
                <div className="relative hidden h-12 w-12 shrink-0 sm:block">
                  <div className="grid-fade absolute inset-0 rounded-xl border border-sky-400/30 bg-sky-500/5" />
                  <svg viewBox="0 0 48 48" className="relative h-12 w-12" aria-hidden="true">
                    <defs>
                      <linearGradient id="bullSilver" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="55%" stopColor="#9fb2c6" />
                        <stop offset="100%" stopColor="#e8f2ff" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M10 12c0 4 2 6 5 7-1 8 2 17 9 20 7-3 10-12 9-20 3-1 5-3 5-7-3 0-5 1-7 3-2-1-4-2-7-2s-5 1-7 2c-2-2-4-3-7-3z"
                      fill="url(#bullSilver)"
                      opacity="0.92"
                    />
                    <path d="M18 25c1.4 0 2.4 1 2.4 2.2S19.4 29 18 29s-2.4-1-2.4-2.2S16.6 25 18 25z" fill="#04060b" />
                    <path d="M30 25c1.4 0 2.4 1 2.4 2.2S31.4 29 30 29s-2.4-1-2.4-2.2S28.6 25 30 25z" fill="#04060b" />
                    <path d="M19 19c3-2 7-2 10 0" stroke="#ff8a1e" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                  </svg>
                  <span className="absolute -inset-1 rounded-xl border border-orange-400/25" />
                </div>
                <div>
                  <p className="flex items-baseline gap-2 font-display text-2xl font-black leading-none tracking-tight">
                    <span className="brand-metal">Bull</span>
                    <span className="brand-lab rounded-md border border-orange-400/60 bg-orange-500/5 px-2 py-0.5 text-xl ring-1 ring-orange-500/20">
                      LAB
                    </span>
                  </p>
                  <p className="mt-1.5 font-display text-[9px] uppercase tracking-[0.28em] text-sky-300/80">
                    Powered by Altcoinitalia <span className="text-slate-500">·</span>{" "}
                    <span className="font-sans text-[11px] italic tracking-normal text-orange-300/90">by Asintomatico</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {kill && (
                      <span className="rounded-full bg-orange-500/15 px-2.5 py-1 font-display text-[10px] font-bold uppercase tracking-wider text-orange-300 ring-1 ring-inset ring-orange-400/40">
                        Buy off
                      </span>
                    )}
                    <ModeBadge mode={mode} />
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-slate-500">VAPI LADDER · 3H · BTC/ETH</p>
                </div>
                <div className="relative h-14 w-14 shrink-0">
                  <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-sky-400/70 via-transparent to-orange-500/70 blur-[2px]" />
                  <Image
                    src="/images/avatar-cyberpunk.jpg"
                    alt="Bull Lab operator"
                    width={112}
                    height={112}
                    priority
                    className="relative h-14 w-14 rounded-full border border-white/20 object-cover shadow-[0_0_22px_-4px_rgba(42,168,255,0.8)]"
                  />
                </div>
              </div>
            </div>
            <div className="mx-auto mt-2 max-w-7xl px-4">
              <Nav />
            </div>
          </header>
          <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">{children}</main>
          <footer className="mx-auto max-w-7xl px-4 pb-8 pt-2">
            <p className="font-display text-[10px] uppercase tracking-[0.22em] text-slate-600">
              Bull Lab · Powered by Altcoinitalia · by Asintomatico — nessuno stop loss, size 1×/1,5×/2,5×
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
