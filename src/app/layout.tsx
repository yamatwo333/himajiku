import type { Metadata, Viewport } from "next";
import "./globals.css";

const appUrl = "https://sharehima.vercel.app";

export const metadata: Metadata = {
  title: "シェアヒマ - ヒマを友達とシェアしよう",
  description: "ヒマな時間をシェアして、なんとなく集まれるアプリ",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "シェアヒマ",
    description: "ヒマな時間をシェアして、なんとなく集まろう",
    url: appUrl,
    siteName: "シェアヒマ",
    images: [
      {
        url: `${appUrl}/api/og`,
        width: 1200,
        height: 630,
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "シェアヒマ",
    description: "ヒマな時間をシェアして、なんとなく集まろう",
    images: [`${appUrl}/api/og`],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
