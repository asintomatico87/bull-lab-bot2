import { NextResponse, type NextRequest } from "next/server";

/**
 * Protezione opzionale del cruscotto (Next.js 16: convenzione "proxy").
 *
 * SPENTA per default: se DASHBOARD_USER e DASHBOARD_PASSWORD non sono impostate,
 * ogni richiesta passa inalterata (necessario per la preview e per lo sviluppo locale).
 *
 * ACCESA: basta impostare le due variabili d'ambiente (es. su Vercel) e tutto il
 * cruscotto chiede utente e password con HTTP Basic Auth.
 *
 * Sempre pubbliche (mai bloccate):
 *  - /api/health      -> healthcheck della piattaforma
 *  - /api/webhook/*   -> TradingView deve poter inviare gli alert
 *  - /api/config-status -> diagnostica di produzione
 */
export function proxy(request: NextRequest) {
  const user = process.env.DASHBOARD_USER;
  const password = process.env.DASHBOARD_PASSWORD;

  if (!user || !password) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/webhook") ||
    pathname.startsWith("/api/config-status")
  ) {
    return NextResponse.next();
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const separator = decoded.indexOf(":");
      const sentUser = decoded.slice(0, separator);
      const sentPassword = decoded.slice(separator + 1);
      if (sentUser === user && sentPassword === password) {
        return NextResponse.next();
      }
    } catch {
      // header malformato: si prosegue verso il 401
    }
  }

  return new NextResponse("Bull Lab: accesso riservato", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Bull Lab Trading System", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
};
