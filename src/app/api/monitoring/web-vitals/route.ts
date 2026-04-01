import { NextRequest, NextResponse } from "next/server";

const TRACKED_METRICS = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    if (typeof payload.name !== "string" || !TRACKED_METRICS.has(payload.name)) {
      return NextResponse.json({ ignored: true });
    }

    console.info(
      JSON.stringify({
        type: "web-vitals",
        name: payload.name,
        value: payload.value,
        rating: payload.rating,
        path: payload.path,
        search: payload.search,
        navigationType: payload.navigationType,
        id: payload.id,
      })
    );

    return NextResponse.json({ ok: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
}
