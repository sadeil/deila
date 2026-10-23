import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge gate for /admin: unauthenticated visitors are sent to the login page.
 * This is defence-in-depth only — every admin page, server action and API route
 * re-checks the session, account status and permissions against the database.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  const token = req.cookies.get("della_admin")?.value;
  let ok = false;
  if (token && process.env.SESSION_SECRET) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET), { algorithms: ["HS256"] });
      ok = payload.k === "admin";
    } catch { ok = false; }
  }
  if (!ok) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
