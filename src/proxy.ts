import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { GUEST_COOKIE_NAME } from "@/lib/actors";
import { E2E_AUTH_COOKIE_NAME, getE2EUserId } from "@/lib/e2e";
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
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const e2eUserId = getE2EUserId(request.cookies.get(E2E_AUTH_COOKIE_NAME)?.value ?? null);

  if (e2eUserId) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_USER_ID_HEADER, e2eUserId);
    return createForwardResponse(requestHeaders);
  }

  const shouldSkipAuthLookup =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/join");

  if (shouldSkipAuthLookup) {
    return NextResponse.next({ request });
  }

  if (!hasSupabaseAuthCookie(request)) {
    if (pathname.startsWith("/calendar") && request.cookies.has(GUEST_COOKIE_NAME)) {
      return NextResponse.next({ request });
    }

    const url = request.nextUrl.clone();
    const redirectTo = pathname + request.nextUrl.search;
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", redirectTo);
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
    "/calendar/:path*",
    "/groups/:path*",
    "/profile",
  ],
};
