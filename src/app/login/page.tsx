"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorParam = searchParams.get("error");
  const [error, setError] = useState<string | null>(null);

  const errorMessages: Record<string, string> = {
    invalid_state: "認証エラーが発生しました。もう一度お試しください。",
    no_code: "認証がキャンセルされました。",
    token_failed: "LINEとの連携に失敗しました。",
    profile_failed: "プロフィールの取得に失敗しました。",
    create_failed: "アカウントの作成に失敗しました。",
    session_failed: "ログインセッションの作成に失敗しました。",
    verify_failed: "認証の確認に失敗しました。",
    unknown: "予期しないエラーが発生しました。",
    auth_failed: "認証に失敗しました。",
  };

  useEffect(() => {
    if (errorParam) {
      setError(errorParam);
      router.replace("/login", { scroll: false });
    }
  }, [errorParam, router]);

  const handleLineLogin = () => {
    setError(null);
    window.location.href = "/auth/line";
  };

  return (
    <div className="flex min-h-dvh flex-col" style={{ backgroundColor: "#ffffff" }}>
      {/* Hero section */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-4">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-4xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            シェアヒマ
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            ヒマな時間をシェアして<br />なんとなく集まれるアプリ
          </p>
        </div>

        {/* Feature cards */}
        <div className="mb-8 w-full max-w-xs space-y-3">
          <div className="flex items-center gap-4 rounded-2xl px-5 py-4" style={{ backgroundColor: "var(--color-bg)" }}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: "#E0F2FE" }}>&#x1F4C5;</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>ヒマな日を登録</p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>時間帯ごとにサクッと登録</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl px-5 py-4" style={{ backgroundColor: "var(--color-bg)" }}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: "#FEF3C7" }}>&#x1F44B;</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>友達とシェア</p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>グループでヒマを共有</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl px-5 py-4" style={{ backgroundColor: "var(--color-bg)" }}>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ backgroundColor: "#FEE2E2" }}>&#x1F514;</span>
            <div>
              <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>LINEに通知</p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>集まれそうな日を自動でお知らせ</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login section - fixed bottom */}
      <div className="sticky bottom-0 px-6 pb-10 pt-4" style={{ backgroundColor: "#ffffff" }}>
        <div className="mx-auto w-full max-w-xs space-y-3">
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">
              {errorMessages[error] ?? errorMessages.unknown}
            </div>
          )}

          <button
            onClick={handleLineLogin}
            className="flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-bold text-white shadow-md transition-all active:scale-[0.97]"
            style={{ backgroundColor: "#06C755" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 5.83 2 10.5c0 4.07 3.57 7.47 8.4 8.29.33.07.77.22.88.5.1.26.07.66.03.92l-.14.87c-.04.26-.2 1.02.89.56.91-.39 4.89-2.88 6.67-4.93C20.63 14.48 22 12.63 22 10.5 22 5.83 17.52 2 12 2zm-3.5 11.5h-2a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v3.75h1.25a.75.75 0 010 1.5zm2.5-.75a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.5 0v4.5zm4.5 0a.75.75 0 01-1.35.45L12.5 10.3v2.45a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.35-.45l2.15 2.9V8.25a.75.75 0 011.5 0v4.5zm3.25-3a.75.75 0 010 1.5h-1.25v1h1.25a.75.75 0 010 1.5h-2a.75.75 0 01-.75-.75v-4.5a.75.75 0 01.75-.75h2a.75.75 0 010 1.5h-1.25v.5h1.25z" />
            </svg>
            LINEでログイン
          </button>

          <p className="text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
            LINEアカウントで10秒ではじめられます
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
