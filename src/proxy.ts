import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) return NextResponse.next();
  const user = process.env.DASHBOARD_USER || "admin";
  const auth = request.headers.get("authorization") || "";
  let valid = false;
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const colon = decoded.indexOf(":");
      valid = decoded.slice(0, colon) === user && decoded.slice(colon + 1) === password;
    } catch { valid = false; }
  }
  if (valid) return NextResponse.next();
  return new NextResponse("Accesso riservato alla dashboard Bull Lab", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Bull Lab dashboard", charset="UTF-8"' },
  });
}

export const config = { matcher: ["/", "/api/reset", "/api/settings"] };
