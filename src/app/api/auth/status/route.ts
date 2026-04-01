import { NextRequest, NextResponse } from "next/server";
import { getRouteUser } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const user = await getRouteUser(request);

  return NextResponse.json(
    { authenticated: Boolean(user) },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    }
  );
}
