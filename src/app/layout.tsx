import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bull Lab — VAPI Ladder 3H",
  description: "Bull Lab Trading System · VAPI LazyBear · BTC/ETH · 3H · Powered by AltcoinItalia",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body className="antialiased">{children}</body>
    </html>
  );
}
