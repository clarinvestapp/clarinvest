import { NextResponse } from "next/server";

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Read Supabase auth cookie directly — no network call, no hanging.
  // Supabase SSR sets a cookie named sb-<ref>-auth-token.
  const allCookies = request.cookies.getAll();
  const hasSession = allCookies.some(
    (c) => c.name.includes("auth-token") && c.value && c.value.length > 10
  );

  // Dashboard + admin require auth
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!hasSession) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect logged-in users away from auth pages
  if (hasSession && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/signup", "/reset-password", "/setup-password"],
};