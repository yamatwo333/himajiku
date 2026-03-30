import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F0F9FF",
          fontFamily: "sans-serif",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "baseline", marginBottom: 24 }}>
          <span style={{ fontSize: 72, fontWeight: 800, color: "#0F172A" }}>
            シェア
          </span>
          <span style={{ fontSize: 72, fontWeight: 800, color: "#0EA5E9" }}>
            ヒマ
          </span>
        </div>

        {/* Tagline */}
        <p style={{ fontSize: 28, color: "#94A3B8", margin: 0 }}>
          ヒマな時間をシェアして、なんとなく集まろう
        </p>

        {/* Dots */}
        <div style={{ display: "flex", gap: 16, marginTop: 40 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#0EA5E9" }} />
          <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#F59E0B" }} />
          <div style={{ width: 20, height: 20, borderRadius: "50%", backgroundColor: "#EF4444" }} />
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
