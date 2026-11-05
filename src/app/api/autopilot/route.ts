import { NextResponse } from "next/server";

// Retired intentionally: in this phase signals must arrive via TradingView and remain paper-only.
export async function POST() {
  return NextResponse.json({
    error: "Auto-Pilot disabilitato. Questa versione accetta solo segnali TradingView in paper mode.",
    code: "AUTOPILOT_DISABLED",
  }, { status: 410 });
}
