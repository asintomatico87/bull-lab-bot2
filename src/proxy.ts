import { NextResponse, type NextRequest } from "next/server";

/**
 * Protegge la dashboard con Basic Auth quando ADMIN_PASSWORD è impostata.
 * Webhook e health check restano pubblici (il webhook è protetto dal secret).
 */
export function proxy(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return NextResponse.next();

  const user = process.env.ADMIN_USER || "admin";
  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const idx = decoded.indexOf(":");
      if (decoded.slice(0, idx) === user && decoded.slice(idx + 1) === password) {
        return NextResponse.next();
      }
    } catch {
      // credenziali malformate
    }
  }
  return new NextResponse("Autenticazione richiesta", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Bull Lab Trading System"' },
  });
}

export const config = {
  matcher: ["/((?!api/webhook|api/health|_next/static|_next/image|favicon.ico).*)"],
};
