import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bull Lab Trading System — Powered by Altcoinitalia by Asintomatico",
  description: "Sistema di trading completamente automatizzato su crypto (Bitcoin & Ethereum). Strategie con indicatori TradingView, connessione No-KYC DEX & CEX, latenze sub-secondo.",
  icons: {
    icon: "/images/bull-lab-logo.jpg",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className="bg-[#06090e] text-slate-100 antialiased selection:bg-cyan-500 selection:text-black font-sans">
        {children}
      </body>
    </html>
  );
}
