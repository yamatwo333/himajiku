import { headers } from "next/headers";
import type { RequestActor } from "@/lib/actors";
import { REQUEST_USER_ID_HEADER } from "@/lib/request-user";
import { getGuestActorFromServerCookies } from "@/lib/server/guest";

export async function getRequestActor(): Promise<RequestActor | null> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get(REQUEST_USER_ID_HEADER);

  if (userId) {
    return {
      kind: "user",
      actorId: userId,
      userId,
    };
  }

  return getGuestActorFromServerCookies();
}
