import type { Metadata, Viewport } from "next";
import PerformanceMonitor from "@/components/PerformanceMonitor";
import "./globals.css";

const appUrl = "https://sharehima.vercel.app";

export const metadata: Metadata = {
  title: "シェアヒマ - ヒマを友達とシェアしよう",
  description: "ヒマな時間をシェアして、なんとなく集まれるアプリ",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "シェアヒマ",
    description: "ヒマな時間をシェアして、なんとなく集まろう",
    url: appUrl,
    siteName: "シェアヒマ",
    images: [
      {
        url: `${appUrl}/og.png`,
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
    images: [`${appUrl}/og.png`],
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
      <body>
        <PerformanceMonitor />
        {children}
      </body>
    </html>
  );
}
