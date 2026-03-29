import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicPath = pathname.startsWith("/login") || pathname.startsWith("/auth") || pathname.startsWith("/api") || pathname.startsWith("/join");

  // 未ログインで保護ページにアクセス → ログインページへ
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    const redirectTo = pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", redirectTo);
    return NextResponse.redirect(url);
  }

  // ログイン済みでログインページにアクセス → リダイレクト先 or カレンダーへ
  if (user && pathname === "/login") {
    const redirect = request.nextUrl.searchParams.get("redirect");
    const url = request.nextUrl.clone();
    if (redirect && redirect.startsWith("/") && !redirect.startsWith("/login")) {
      url.pathname = redirect.split("?")[0];
      const redirectSearch = redirect.includes("?") ? redirect.substring(redirect.indexOf("?")) : "";
      url.search = redirectSearch;
    } else {
      url.pathname = "/calendar";
      url.search = "";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
