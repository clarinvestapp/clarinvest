import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Write OAuth provider name to user_profiles.display_name if not already set.
      // Non-blocking — redirect proceeds regardless of outcome.
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const oauthName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            null;
          if (oauthName) {
            await supabase
              .from("user_profiles")
              .update({ display_name: oauthName })
              .eq("id", user.id)
              .is("display_name", null);
          }
        }
      } catch { /* non-blocking */ }

      // Fire welcome email for new users — non-blocking
      try {
        const { data: { user: welcomeUser } } = await supabase.auth.getUser();
        if (welcomeUser) {
          fetch(`${origin}/api/welcome`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: welcomeUser.id }),
          }).catch(() => {});
        }
      } catch { /* non-blocking */ }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}