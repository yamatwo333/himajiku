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
    const redirect = searchParams.get("redirect");
    if (redirect) {
      window.location.href = `/auth/line?redirect=${encodeURIComponent(redirect)}`;
    } else {
      window.location.href = "/auth/line";
    }
  };

  // Mock calendar data: { day: [selfFree, friendCount] }
  const mockData: Record<string, [boolean, number]> = {
    "3": [true, 0], "5": [false, 1], "8": [true, 0],
    "10": [true, 1], "14": [false, 1], "15": [true, 2],
    "19": [true, 1], "21": [false, 1],
  };

  return (
    <div className="flex min-h-dvh flex-col" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mb-6 text-center">
          <h1 className="text-5xl font-extrabold tracking-tight" style={{ color: "var(--color-text)" }}>
            シェア<span style={{ color: "var(--color-primary)" }}>ヒマ</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            ヒマな時間をシェアして、なんとなく集まろう
          </p>
        </div>

        {/* Mock calendar */}
        <div className="mb-6 w-full max-w-[280px] rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <div className="mb-3 text-center text-sm font-bold" style={{ color: "var(--color-text)" }}>4月</div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {["月","火","水","木","金","土","日"].map(d => <div key={d} className="py-0.5">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs mt-1">
            {[" "," ","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21"].map((d, i) => {
              const data = mockData[d];
              const selfFree = data?.[0] ?? false;
              const friendCount = data?.[1] ?? 0;
              const totalCount = (selfFree ? 1 : 0) + friendCount;
              const isHot = totalCount >= 2;
              return (
                <div key={i} className="flex flex-col items-center py-1">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
                    style={{
                      backgroundColor: isHot ? "var(--color-hot)" : "transparent",
                      color: d === " " ? "transparent" : isHot ? "white" : "var(--color-text)",
                      fontWeight: isHot ? 700 : 400,
                    }}
                  >{d || "\u00A0"}</span>
                  <div className="mt-0.5 flex gap-[2px]">
                    {selfFree && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-free-self)" }} />}
                    {friendCount > 0 && <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--color-free-friend)" }} />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-center gap-3 text-[10px]" style={{ color: "var(--color-text-secondary)" }}>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-free-self)" }} />自分がヒマ</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-free-friend)" }} />友達がヒマ</span>
            <span className="flex items-center gap-1"><span className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-bold text-white" style={{ backgroundColor: "var(--color-hot)" }}>3</span>集まったっていい</span>
          </div>
        </div>

        <div className="flex gap-6 text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
          <div>
            <div className="mb-1 text-xl">&#x1F4C5;</div>
            <p>ヒマをシェア</p>
          </div>
          <div>
            <div className="mb-1 text-xl">&#x1F44B;</div>
            <p>友達と共有</p>
          </div>
          <div>
            <div className="mb-1 text-xl">&#x1F514;</div>
            <p>LINEに通知</p>
          </div>
        </div>
      </div>

      {/* Login button */}
      <div className="px-6 pb-10 pt-6">
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
