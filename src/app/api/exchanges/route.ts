import { NextResponse } from "next/server";

// Exchange credential collection is disabled until a real connector and secret storage are implemented.
export async function GET() {
  return NextResponse.json({ profiles: [], connected: false, message: "Nessun exchange collegato in questa fase." });
}

export async function POST() {
  return NextResponse.json({
    error: "Inserimento chiavi exchange disabilitato. Non inviare o inserire credenziali finché il connettore non sarà pronto.",
    code: "EXCHANGE_CONNECTOR_NOT_IMPLEMENTED",
  }, { status: 410 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Gestione profili exchange non disponibile." }, { status: 410 });
}
