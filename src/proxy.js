import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function proxy(request) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get:    (name)         => request.cookies.get(name)?.value,
        set:    (name,val,opt) => { res.cookies.set({ name, value:val, ...opt }); },
        remove: (name,opt)     => { res.cookies.set({ name, value:"", ...opt }); },
      },
    }
  );

  const { data:{ session } } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  // Dashboard + admin require auth
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    // Admin routes also require role=admin
    if (pathname.startsWith("/admin") && session.user.user_metadata?.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // Redirect logged-in users away from auth pages
  if (session && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/login", "/signup", "/reset-password", "/setup-password"],
};