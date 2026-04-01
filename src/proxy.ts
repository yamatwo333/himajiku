import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { REQUEST_USER_ID_HEADER } from "@/lib/request-user";

function createForwardResponse(headers: Headers) {
  return NextResponse.next({
    request: {
      headers,
    },
  });
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublicEntry = pathname === "/" || pathname === "/login";
  const shouldSkipAuthLookup =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/join");

  if (shouldSkipAuthLookup) {
    return NextResponse.next({ request });
  }

  if (isPublicEntry) {
    if (!hasSupabaseAuthCookie(request)) {
      return NextResponse.next({ request });
    }

    const redirect = request.nextUrl.searchParams.get("redirect");
    const url = request.nextUrl.clone();

    if (redirect && redirect.startsWith("/") && !redirect.startsWith("/login")) {
      url.pathname = redirect.split("?")[0];
      url.search = redirect.includes("?")
        ? redirect.substring(redirect.indexOf("?"))
        : "";
    } else {
      url.pathname = "/calendar";
      url.search = "";
    }

    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  let supabaseResponse = createForwardResponse(requestHeaders);

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
          supabaseResponse = createForwardResponse(requestHeaders);
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

  if (!user && !pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    const redirectTo = pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", redirectTo);
    return NextResponse.redirect(url);
  }

  if (user) {
    requestHeaders.set(REQUEST_USER_ID_HEADER, user.id);

    const nextResponse = createForwardResponse(requestHeaders);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      nextResponse.cookies.set(cookie);
    }
    supabaseResponse = nextResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api|auth|join|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
