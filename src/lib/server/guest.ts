import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildGuestActorId, GUEST_COOKIE_NAME, type GuestActor } from "@/lib/actors";
import { createAdminClient } from "@/lib/supabase/admin";

interface GuestMemberRow {
  id: string;
  group_id: string;
  display_name: string;
}

function hashGuestToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createGuestToken() {
  return randomBytes(24).toString("hex");
}

async function findGuestMemberByToken(
  supabase: SupabaseClient,
  guestToken: string | null
) {
  if (!guestToken) {
    return null;
  }

  const { data } = await supabase
    .from("guest_members")
    .select("id, group_id, display_name")
    .eq("guest_token_hash", hashGuestToken(guestToken))
    .maybeSingle();

  return (data as GuestMemberRow | null) ?? null;
}

function mapGuestRowToActor(row: GuestMemberRow): GuestActor {
  return {
    kind: "guest",
    actorId: buildGuestActorId(row.id),
    guestMemberId: row.id,
    groupId: row.group_id,
    displayName: row.display_name,
  };
}

export async function getGuestActorFromRequest(
  request: NextRequest,
  supabase: SupabaseClient = createAdminClient()
) {
  const guestToken = request.cookies.get(GUEST_COOKIE_NAME)?.value ?? null;
  const row = await findGuestMemberByToken(supabase, guestToken);

  return row ? mapGuestRowToActor(row) : null;
}

export async function getGuestActorFromServerCookies(
  supabase: SupabaseClient = createAdminClient()
) {
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(GUEST_COOKIE_NAME)?.value ?? null;
  const row = await findGuestMemberByToken(supabase, guestToken);

  return row ? mapGuestRowToActor(row) : null;
}

export async function createGuestMember({
  supabase = createAdminClient(),
  groupId,
  displayName,
}: {
  supabase?: SupabaseClient;
  groupId: string;
  displayName: string;
}) {
  const guestToken = createGuestToken();
  const guestTokenHash = hashGuestToken(guestToken);
  const { data, error } = await supabase
    .from("guest_members")
    .insert({
      guest_token_hash: guestTokenHash,
      group_id: groupId,
      display_name: displayName,
    })
    .select("id, group_id, display_name")
    .single();

  if (error || !data) {
    throw error ?? new Error("guest member insert failed");
  }

  return {
    guestToken,
    actor: mapGuestRowToActor(data as GuestMemberRow),
  };
}

export function setGuestCookie(response: NextResponse, guestToken: string) {
  response.cookies.set(GUEST_COOKIE_NAME, guestToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export function clearGuestCookie(response: NextResponse) {
  response.cookies.set(GUEST_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
