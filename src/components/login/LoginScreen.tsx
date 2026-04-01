import BrandLogo from "@/components/BrandLogo";

const TIME_SLOTS = ["morning", "afternoon", "evening", "late_night"] as const;

const ERROR_MESSAGES: Record<string, string> = {
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

const MOCK_DATA: Record<string, { self: string[]; friends: string[][] }> = {
  "3": { self: ["morning"], friends: [] },
  "5": { self: [], friends: [["afternoon"]] },
  "8": { self: ["evening"], friends: [] },
  "10": { self: ["morning"], friends: [["afternoon"]] },
  "14": { self: [], friends: [["late_night"]] },
  "15": { self: ["evening"], friends: [["evening"], ["evening"]] },
  "19": { self: ["afternoon"], friends: [["morning"]] },
  "21": { self: [], friends: [["evening"]] },
};

interface LoginScreenProps {
  redirectPath?: string;
  errorCode?: string | null;
}

function getLineLoginHref(redirectPath?: string) {
  if (!redirectPath) {
    return "/auth/line";
  }

  return `/auth/line?redirect=${encodeURIComponent(redirectPath)}`;
}

export default function LoginScreen({
  redirectPath,
  errorCode,
}: LoginScreenProps) {
  const loginHref = getLineLoginHref(redirectPath);
  const errorMessage = errorCode ? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.unknown : null;

  return (
    <div className="flex min-h-svh flex-col" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="flex flex-1 flex-col items-center px-6 pt-[calc(env(safe-area-inset-top)+2.75rem)]">
        <div className="mb-6 text-center">
          <BrandLogo variant="lockup" className="mx-auto -mb-2" />
          <p
            className="mx-auto mt-2.5 max-w-[320px] text-sm leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            ヒマな時間をシェアして、なんとなく集まろう
          </p>
        </div>

        <div
          className="mb-6 w-full max-w-[280px] rounded-2xl border p-4 shadow-sm"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div
            className="mb-3 text-center text-sm font-bold"
            style={{ color: "var(--color-text)" }}
          >
            4月
          </div>
          <div
            className="grid grid-cols-7 gap-1 text-center text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
              <div key={day} className="py-0.5">
                {day}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
            {[
              " ",
              " ",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "16",
              "17",
              "18",
              "19",
              "20",
              "21",
            ].map((day, index) => {
              const data = MOCK_DATA[day];
              const selfSlots = data?.self ?? [];
              const friendSlots = data?.friends ?? [];
              const selfFree = selfSlots.length > 0;
              const friendCount = friendSlots.length;
              const isHot = TIME_SLOTS.some((slot) => {
                const count =
                  (selfSlots.includes(slot) ? 1 : 0) +
                  friendSlots.filter((friend) => friend.includes(slot)).length;

                return count >= 2;
              });

              return (
                <div key={`${day}-${index}`} className="flex flex-col items-center py-1">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
                    style={{
                      backgroundColor: isHot ? "var(--color-hot)" : "transparent",
                      color:
                        day === " "
                          ? "transparent"
                          : isHot
                            ? "white"
                            : "var(--color-text)",
                      fontWeight: isHot ? 700 : 400,
                    }}
                  >
                    {day || "\u00A0"}
                  </span>
                  <div className="mt-0.5 flex gap-[2px]">
                    {selfFree && (
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: "var(--color-free-self)" }}
                      />
                    )}
                    {friendCount > 0 && (
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: "var(--color-free-friend)" }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="mt-3 flex items-center justify-center gap-3 text-[10px]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--color-free-self)" }}
              />
              自分がヒマ
            </span>
            <span className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--color-free-friend)" }}
              />
              友達がヒマ
            </span>
            <span className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--color-hot)" }}
              />
              集まったっていい
            </span>
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

      <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-6">
        <div className="mx-auto w-full max-w-xs space-y-3">
          {errorMessage && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-600">
              {errorMessage}
            </div>
          )}
          <a
            href={loginHref}
            className="flex w-full items-center justify-center gap-3 rounded-2xl px-6 py-4 text-base font-bold text-white shadow-md transition-transform active:scale-[0.97]"
            style={{ backgroundColor: "#06C755" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" aria-hidden="true">
              <path d="M12 2C6.48 2 2 5.83 2 10.5c0 4.07 3.57 7.47 8.4 8.29.33.07.77.22.88.5.1.26.07.66.03.92l-.14.87c-.04.26-.2 1.02.89.56.91-.39 4.89-2.88 6.67-4.93C20.63 14.48 22 12.63 22 10.5 22 5.83 17.52 2 12 2zm-3.5 11.5h-2a.75.75 0 01-.75-.75v-4.5a.75.75 0 011.5 0v3.75h1.25a.75.75 0 010 1.5zm2.5-.75a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.5 0v4.5zm4.5 0a.75.75 0 01-1.35.45L12.5 10.3v2.45a.75.75 0 01-1.5 0v-4.5a.75.75 0 011.35-.45l2.15 2.9V8.25a.75.75 0 011.5 0v4.5zm3.25-3a.75.75 0 010 1.5h-1.25v1h1.25a.75.75 0 010 1.5h-2a.75.75 0 01-.75-.75v-4.5a.75.75 0 01.75-.75h2a.75.75 0 010 1.5h-1.25v.5h1.25z" />
            </svg>
            LINEでログイン
          </a>
          <p className="text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
            LINEアカウントで10秒ではじめられます
          </p>
        </div>
      </div>
    </div>
  );
}
