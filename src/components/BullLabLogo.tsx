"use client";

import React from "react";

type LogoSize = "sm" | "md" | "lg";

interface BullLabLogoProps {
  size?: LogoSize;
  /** mostra "POWERED BY ALTCOINITALIA" sotto il wordmark */
  showTagline?: boolean;
  /** mostra "by Asintomatico" a destra */
  showFounder?: boolean;
  className?: string;
}

const SIZES: Record<
  LogoSize,
  { mark: number; bull: string; lab: string; tag: string; gap: string; radius: string }
> = {
  sm: { mark: 30, bull: "text-[17px]", lab: "text-[17px]", tag: "text-[6.5px]", gap: "gap-2", radius: "rounded-[9px]" },
  md: { mark: 42, bull: "text-[25px]", lab: "text-[25px]", tag: "text-[8px]", gap: "gap-2.5", radius: "rounded-xl" },
  lg: { mark: 56, bull: "text-[34px]", lab: "text-[34px]", tag: "text-[10px]", gap: "gap-3", radius: "rounded-2xl" },
};

/**
 * Marchio Bull Lab: toro stilizzato neon + wordmark metallico + badge LAB.
 * SVG/CSS puro: resta nitido su qualsiasi schermo e non dipende da immagini.
 */
export default function BullLabLogo({
  size = "md",
  showTagline = true,
  showFounder = false,
  className = "",
}: BullLabLogoProps) {
  const s = SIZES[size];

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {/* Marchio: toro neon dentro un riquadro smussato */}
      <div
        className={`logo-mark relative shrink-0 ${s.radius} overflow-hidden border border-cyan-400/50 transition-all group-hover:border-cyan-300`}
        style={{ width: s.mark, height: s.mark }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1a2b] via-[#050b13] to-[#1a0f06]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,210,255,0.28),transparent_60%)]" />
        <svg
          viewBox="0 0 48 48"
          className="relative w-full h-full"
          role="img"
          aria-label="Bull Lab"
        >
          <defs>
            <linearGradient id="blBullBody" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#eaf6ff" />
              <stop offset="45%" stopColor="#9fd8f2" />
              <stop offset="100%" stopColor="#00a8d4" />
            </linearGradient>
            <linearGradient id="blHorn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffb35c" />
              <stop offset="100%" stopColor="#ff6b00" />
            </linearGradient>
          </defs>

          {/* corna */}
          <path
            d="M9 15c0-4 3-6 6-6 1.6 0 3 .7 4 1.8M39 15c0-4-3-6-6-6-1.6 0-3 .7-4 1.8"
            fill="none"
            stroke="url(#blHorn)"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          {/* muso + testa */}
          <path
            d="M15 20.5c0-3.6 3.2-6.5 9-6.5s9 2.9 9 6.5v7.2c0 5-3.9 8.8-9 8.8s-9-3.8-9-8.8z"
            fill="url(#blBullBody)"
          />
          {/* occhi */}
          <circle cx="19.4" cy="21.6" r="1.7" fill="#04121d" />
          <circle cx="28.6" cy="21.6" r="1.7" fill="#04121d" />
          {/* narici */}
          <path d="M21 30.5h1.7M25.3 30.5H27" stroke="#0b2b3d" strokeWidth="1.6" strokeLinecap="round" />
          {/* orecchie */}
          <path d="M14.6 18.4c-1.8-.4-3 .4-3.4 1.8 1.3.7 2.7.4 3.4-.6z" fill="#cfeaf8" />
          <path d="M33.4 18.4c1.8-.4 3 .4 3.4 1.8-1.3.7-2.7.4-3.4-.6z" fill="#cfeaf8" />
        </svg>
      </div>

      {/* Wordmark */}
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-[3px]">
          <span
            className={`${s.bull} font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-500 sheen-text`}
          >
            Bull
          </span>
          <span
            className={`${s.lab} font-black tracking-tight px-[6px] py-[1px] rounded-[5px] text-[#1a0d03] bg-gradient-to-b from-[#ffc061] via-[#ff8a1f] to-[#e25600] shadow-[0_0_14px_-1px_rgba(255,107,0,0.75)]`}
          >
            LAB
          </span>
        </div>
        {showTagline && (
          <span
            className={`${s.tag} mt-[3px] font-mono font-bold uppercase tracking-[0.2em] text-cyan-300/80`}
          >
            Powered by Altcoinitalia
          </span>
        )}
      </div>

      {showFounder && (
        <span className="ml-1 hidden xl:inline-flex items-center gap-1 px-2 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-300">
          by Asintomatico
        </span>
      )}
    </div>
  );
}
