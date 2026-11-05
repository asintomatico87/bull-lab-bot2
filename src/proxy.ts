import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/api/health", "/api/config-status"];

/** Dashboard Basic Auth. TradingView can POST to the webhook without browser credentials. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isWebhook = pathname === "/api/webhook/tradingview";
  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (isPublic || isWebhook) return NextResponse.next();

  const user = process.env.DASHBOARD_USER;
  const password = process.env.DASHBOARD_PASSWORD;
  if (!user || !password) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse("Bull Lab: dashboard auth is not configured. Set DASHBOARD_USER and DASHBOARD_PASSWORD.", { status: 503 });
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const separator = decoded.indexOf(":");
      if (separator >= 0 && decoded.slice(0, separator) === user && decoded.slice(separator + 1) === password) {
        return NextResponse.next();
      }
    } catch {
      // Invalid Basic credentials fall through to the challenge.
    }
  }
  return new NextResponse("Bull Lab: accesso riservato", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Bull Lab Trading System", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"] };
