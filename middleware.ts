import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { AUTH_SECRET } from "@/lib/auth/secret";

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: AUTH_SECRET
  });
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/settings") && !token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname === "/signup") && token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/settings/:path*", "/login", "/signup"]
};
