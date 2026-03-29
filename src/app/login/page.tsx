"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const handleLineLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "kakao" as "google", // TODO: LINE provider設定後に変更
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <div className="mb-12 text-center">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">
          hima<span style={{ color: "var(--color-primary)" }}>jiku</span>
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          ヒマを共有しよう
        </p>
      </div>

      <div className="w-full max-w-xs space-y-4">
        <button
          onClick={handleLineLogin}
          className="flex w-full items-center justify-center gap-3 rounded-xl px-6 py-4 text-base font-bold text-white transition-transform active:scale-[0.97]"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2C6.48 2 2 5.83 2 10.5c0 4.07 3.57 7.47 8.4 8.29.33.07.77.22.88.5.1.26.07.66.03.92l-.14.87c-.04.26-.2 1.02.89.56.91-.39 4.89-2.88 6.67-4.93C20.63 14.48 22 12.63 22 10.5 22 5.83 17.52 2 12 2zm-3.5 11.5h-2a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v3.75h1.25a.75.75 0 010 1.5zm2.5-.75a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.5 0v4.5zm4.5 0a.75.75 0 01-1.35.45L12.5 10.3v2.45a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.35-.45l2.15 2.9V8.25a.75.75 0 011.5 0v4.5zm3.25-3a.75.75 0 010 1.5h-1.25v1h1.25a.75.75 0 010 1.5h-2a.75.75 0 01-.75-.75v-4.5a.75.75 0 01.75-.75h2a.75.75 0 010 1.5h-1.25v.5h1.25z" />
          </svg>
          LINEでログイン
        </button>

        <p
          className="text-center text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          ログインすると友達のヒマが見えるようになります
        </p>
      </div>
    </div>
  );
}
