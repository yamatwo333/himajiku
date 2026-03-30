import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get("line_oauth_state")?.value;
  const origin = new URL(request.url).origin;

  if (!state || state !== savedState) {
    return NextResponse.redirect(`${origin}/login?error=invalid_state`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${origin}/auth/line/callback`,
        client_id: process.env.LINE_CHANNEL_ID!,
        client_secret: process.env.LINE_CHANNEL_SECRET!,
      }),
    });

    if (!tokenRes.ok) {
      console.error("LINE token error:", await tokenRes.text());
      return NextResponse.redirect(`${origin}/login?error=token_failed`);
    }

    const tokenData = await tokenRes.json();

    // 2. Get LINE profile
    const profileRes = await fetch("https://api.line.me/v2/profile", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(`${origin}/login?error=profile_failed`);
    }

    const profile = await profileRes.json();
    const email = `line_${profile.userId}@sharehima.app`;

    // 3. Supabase Admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 4. Create user (ignore error if already exists)
    const { error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          line_id: profile.userId,
          name: profile.displayName,
          avatar_url: profile.pictureUrl,
        },
      });

    if (createError && createError.code !== "email_exists") {
      console.error("User creation error:", createError);
      return NextResponse.redirect(`${origin}/login?error=create_failed`);
    }

    // 5. Generate magic link (works for both new and existing users)
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError || !linkData) {
      console.error("Magic link error:", linkError);
      return NextResponse.redirect(`${origin}/login?error=session_failed`);
    }

    // 6. Verify OTP to create session cookie
    // Check for redirect cookie (set before login)
    const rawRedirect = request.cookies.get("login_redirect")?.value;
    let redirectTo = "/calendar";
    if (rawRedirect) {
      try {
        redirectTo = decodeURIComponent(rawRedirect);
      } catch {
        redirectTo = rawRedirect;
      }
      // セキュリティ: 相対パスのみ許可
      if (!redirectTo.startsWith("/")) redirectTo = "/calendar";
    }
    let supabaseResponse = NextResponse.redirect(`${origin}${redirectTo}`);
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (verifyError) {
      console.error("OTP verify error:", verifyError);
      return NextResponse.redirect(`${origin}/login?error=verify_failed`);
    }

    // 7. Ensure profile exists (DB trigger may have failed)
    const userId = linkData.user.id;
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!existingProfile) {
      await supabaseAdmin.from("profiles").insert({
        id: userId,
        display_name: profile.displayName || email.split("@")[0],
        avatar_url: profile.pictureUrl || null,
      });
    } else {
      // Update LINE profile info
      await supabaseAdmin
        .from("profiles")
        .update({
          display_name: profile.displayName,
          avatar_url: profile.pictureUrl || null,
        })
        .eq("id", userId);
    }

    supabaseResponse.cookies.set("line_oauth_state", "", { maxAge: 0, path: "/" });
    supabaseResponse.cookies.set("login_redirect", "", { maxAge: 0, path: "/" });

    return supabaseResponse;
  } catch (error) {
    console.error("LINE auth error:", error);
    return NextResponse.redirect(`${origin}/login?error=unknown`);
  }
}
