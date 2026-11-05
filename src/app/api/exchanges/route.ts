import { NextResponse } from "next/server";
import { db } from "@/db";
import { exchangeProfiles } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    const profiles = await db
      .select()
      .from(exchangeProfiles)
      .orderBy(desc(exchangeProfiles.id));
    return NextResponse.json({ profiles });
  } catch (error) {
    console.error("Failed to fetch exchange profiles:", error);
    return NextResponse.json({ error: "Impossibile caricare i profili exchange" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      platformKey = "hyperliquid_dex",
      kycType = "DECENTRALIZED",
      apiKey = "",
      walletAddress = "",
      isTestnet = true,
      balanceUsdt = "5000",
    } = body;

    if (!name || String(name).trim() === "") {
      return NextResponse.json({ error: "Inserisci un nome per la connessione" }, { status: 400 });
    }

    const maskedKey =
      apiKey && apiKey.length > 6
        ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
        : "agent_key_configurata";

    const [created] = await db
      .insert(exchangeProfiles)
      .values({
        name: String(name).trim(),
        platformKey,
        kycType,
        apiKeyMasked: maskedKey,
        walletAddress: walletAddress ? String(walletAddress).trim() : null,
        isTestnet: Boolean(isTestnet),
        balanceUsdt: String(balanceUsdt),
        isActive: true,
      })
      .returning();

    return NextResponse.json({ success: true, profile: created });
  } catch (error) {
    console.error("Failed to create exchange profile:", error);
    return NextResponse.json({ error: "Errore nel salvataggio della connessione" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, isActive, isTestnet, balanceUsdt } = body;

    if (!id) {
      return NextResponse.json({ error: "ID profilo mancante" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (isActive !== undefined) updates.isActive = Boolean(isActive);
    if (isTestnet !== undefined) updates.isTestnet = Boolean(isTestnet);
    if (balanceUsdt !== undefined) updates.balanceUsdt = String(balanceUsdt);

    const [updated] = await db
      .update(exchangeProfiles)
      .set(updates)
      .where(eq(exchangeProfiles.id, Number(id)))
      .returning();

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    console.error("Failed to update exchange profile:", error);
    return NextResponse.json({ error: "Impossibile aggiornare il profilo" }, { status: 500 });
  }
}
