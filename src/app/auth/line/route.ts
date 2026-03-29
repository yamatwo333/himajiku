import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const state = crypto.randomBytes(16).toString("hex");
  const channelId = process.env.LINE_CHANNEL_ID!;
  const origin = new URL(request.url).origin;

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: `${origin}/auth/line/callback`,
    state,
    scope: "profile openid",
  });

  const response = NextResponse.redirect(
    `https://access.line.me/oauth2/v2.1/authorize?${params.toString()}`
  );

  response.cookies.set("line_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
