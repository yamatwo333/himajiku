export const GUEST_COOKIE_NAME = "sharehima_guest_token";
const GUEST_ACTOR_PREFIX = "guest:";

export interface UserActor {
  kind: "user";
  actorId: string;
  userId: string;
}

export interface GuestActor {
  kind: "guest";
  actorId: string;
  guestMemberId: string;
  groupId: string;
  displayName: string;
}

export type RequestActor = UserActor | GuestActor;

export function buildGuestActorId(guestMemberId: string) {
  return `${GUEST_ACTOR_PREFIX}${guestMemberId}`;
}

export function isGuestActorId(value: string | null | undefined) {
  return Boolean(value?.startsWith(GUEST_ACTOR_PREFIX));
}
