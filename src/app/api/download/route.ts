import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Serve l'archivio completo del progetto (senza node_modules e senza .env).
 * GET /api/download  oppure direttamente /bull-lab-bot.zip
 */
export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "bull-lab-bot.zip");
    const file = await readFile(filePath);

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="bull-lab-bot.zip"',
        "Content-Length": String(file.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Archivio non trovato. Scaricalo da /bull-lab-bot.zip" },
      { status: 404 }
    );
  }
}
