import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { RequestActor } from "@/lib/actors";
import {
  createE2ERouteUser,
  E2E_AUTH_COOKIE_NAME,
  getE2EUserId,
} from "@/lib/e2e";
import { getGuestActorFromRequest } from "@/lib/server/guest";

export function createRouteClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );
}

export async function getRouteUser(request: NextRequest): Promise<User | null> {
  const e2eUserId = getE2EUserId(
    request.cookies.get(E2E_AUTH_COOKIE_NAME)?.value ?? null
  );

  if (e2eUserId) {
    return createE2ERouteUser(e2eUserId);
  }

  const supabase = createRouteClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function getRouteActor(
  request: NextRequest
): Promise<RequestActor | null> {
  const user = await getRouteUser(request);

  if (user) {
    return {
      kind: "user",
      actorId: user.id,
      userId: user.id,
    };
  }

  return getGuestActorFromRequest(request);
}
