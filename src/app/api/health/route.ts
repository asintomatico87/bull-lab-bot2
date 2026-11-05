import { db, isDatabaseConfigured } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured) {
    return Response.json(
      {
        ok: false,
        database: "not_configured",
        hint: "Aggiungi la variabile d'ambiente DATABASE_URL (Neon/Supabase) e ridistribuisci.",
      },
      { status: 500 }
    );
  }

  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: "connected" });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        database: "unreachable",
        hint: "DATABASE_URL impostata ma la connessione fallisce: controlla stringa, password e stato del progetto Neon.",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
