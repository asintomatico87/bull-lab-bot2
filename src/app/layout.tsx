import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bull Lab Command Center — VAPI Ladder 3H",
  description: "Cruscotto paper BTC ed ETH · VAPI LazyBear 3H · Bull Lab by Asintomatico",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <body className="antialiased">{children}</body>
    </html>
  );
}
