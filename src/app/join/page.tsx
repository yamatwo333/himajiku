"use client";

import CharacterSticker from "@/components/CharacterSticker";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CHARACTER_ASSETS } from "@/lib/characters";

function JoinLoadingFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="text-center" role="status" aria-live="polite">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
        <p className="mt-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>招待情報を確認中...</p>
      </div>
    </div>
  );
}

function JoinErrorCard({
  message,
  onBack,
}: {
  message: string;
  onBack: () => void;
}) {
  return (
    <div
      data-testid="join-error-card"
      role="alert"
      aria-live="assertive"
      className="w-full max-w-sm rounded-2xl border px-5 py-6 text-center"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "rgba(239, 68, 68, 0.16)",
      }}
    >
      <CharacterSticker
        src={CHARACTER_ASSETS.stormCloud.src}
        alt={CHARACTER_ASSETS.stormCloud.alt}
        className="mx-auto mb-4 h-20 w-auto object-contain"
      />
      <h1 className="text-sm font-bold text-red-600">参加できませんでした</h1>
      <p className="mt-1 text-sm leading-relaxed text-red-500">{message}</p>
      <button
        onClick={onBack}
        className="mt-6 rounded-xl border px-8 py-3 text-sm"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
      >
        ログイン画面へ戻る
      </button>
    </div>
  );
}

function GuestDisplayNameCard({
  groupName,
  value,
  submitting,
  onChange,
  onSubmit,
}: {
  groupName: string;
  value: string;
  submitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div
      data-testid="join-guest-name-card"
      className="w-full max-w-sm rounded-2xl border px-5 py-6 text-center"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <CharacterSticker
        src={CHARACTER_ASSETS.cheerCloud.src}
        alt={CHARACTER_ASSETS.cheerCloud.alt}
        className="mx-auto mb-4 h-20 w-auto object-contain"
      />
      <h1 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
        {groupName ? `「${groupName}」に参加する` : "グループに参加する"}
      </h1>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        未ログインでも1グループまで使えます。まずは表示名を入力してください。
      </p>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        placeholder="表示名（例: たけし）"
        maxLength={24}
        className="mt-5 w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors focus:border-[var(--color-primary)]"
        style={{ backgroundColor: "var(--color-bg)", borderColor: "var(--color-border)" }}
      />
      <button
        onClick={onSubmit}
        disabled={submitting || !value.trim()}
        className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        {submitting ? "参加中..." : "この名前で参加する"}
      </button>
    </div>
  );
}

function LoginRequiredCard({
  message,
  onLogin,
  onBackToCurrentGroup,
}: {
  message: string;
  onLogin: () => void;
  onBackToCurrentGroup: () => void;
}) {
  return (
    <div
      data-testid="join-login-required-card"
      className="w-full max-w-sm rounded-2xl border px-5 py-6 text-center"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "rgba(14, 165, 233, 0.16)",
      }}
    >
      <CharacterSticker
        src={CHARACTER_ASSETS.lineUnlinked.src}
        alt={CHARACTER_ASSETS.lineUnlinked.alt}
        className="mx-auto mb-4 h-20 w-auto object-contain"
      />
      <h1 className="text-lg font-bold" style={{ color: "var(--color-text)" }}>
        複数グループを使うにはLINEログイン
      </h1>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        {message}
      </p>
      <button
        onClick={onLogin}
        className="mt-5 w-full rounded-xl px-4 py-3 text-sm font-bold text-white"
        style={{ backgroundColor: "var(--color-primary)" }}
      >
        LINEでログインする
      </button>
      <button
        onClick={onBackToCurrentGroup}
        className="mt-3 w-full rounded-xl border px-4 py-3 text-sm"
        style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
      >
        今のグループに戻る
      </button>
    </div>
  );
}

type JoinStatus = "loading" | "success" | "error" | "name_required" | "login_required";

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code") || "";
  const [status, setStatus] = useState<JoinStatus>("loading");
  const [message, setMessage] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submittingGuestName, setSubmittingGuestName] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState("");
  const missingCode = !code;

  const submitJoin = useCallback(async (guestDisplayName?: string) => {
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invite_code: code,
          ...(guestDisplayName ? { display_name: guestDisplayName } : {}),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage("");
        setGroupName(data.group?.name || "");
        setGroupId(data.group?.id || "");
        return;
      }

      if (res.status === 409 && data.code === "LOGIN_REQUIRED_FOR_MULTIPLE_GROUPS") {
        setStatus("login_required");
        setMessage(
          data.error ||
            "未ログインでは1グループまでお試しできます。LINEでログインすると、複数グループ参加、自分向け通知、予定の引き継ぎが使えます。"
        );
        setCurrentGroupId(data.current_group?.id || "");
        return;
      }

      if (res.status === 400 && data.code === "DISPLAY_NAME_REQUIRED") {
        setStatus("name_required");
        setMessage(data.error || "表示名を入力してください");
        setGroupName(data.group?.name || "");
        setGroupId(data.group?.id || "");
        return;
      }

      if (res.status === 409) {
        setStatus("success");
        setMessage(data.error || "すでに参加済みです");
        setGroupName(data.group?.name || "");
        setGroupId(data.group?.id || "");
        return;
      }

      if (res.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(`/join?code=${code}`)}`);
        return;
      }

      setStatus("error");
      setMessage(data.error || "参加に失敗しました");
    } catch {
      setStatus("error");
      setMessage("エラーが発生しました");
    } finally {
      setSubmittingGuestName(false);
    }
  }, [code, router]);

  useEffect(() => {
    if (missingCode) {
      return;
    }

    void submitJoin();
  }, [missingCode, submitJoin]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      {status === "loading" && (
        <div className="w-full max-w-sm text-center" role="status" aria-live="polite">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
          <p className="mt-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>グループに参加中...</p>
        </div>
      )}

      {status === "success" && (
        <div className="w-full max-w-sm text-center" data-testid="join-success-card">
          <CharacterSticker
            src={CHARACTER_ASSETS.joinSuccess.src}
            alt={CHARACTER_ASSETS.joinSuccess.alt}
            className="mx-auto mb-4 h-24 w-auto object-contain"
          />
          <h1 className="text-xl font-bold">
            {groupName ? `「${groupName}」に${message ? "参加済みです" : "参加しました！"}` : "すでに参加済みです"}
          </h1>
          <button
            onClick={() => router.push(groupId ? `/calendar?group=${groupId}` : "/calendar")}
            className="mt-6 rounded-xl px-8 py-3 text-sm font-bold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            カレンダーを見る
          </button>
        </div>
      )}

      {status === "name_required" ? (
        <GuestDisplayNameCard
          groupName={groupName}
          value={displayName}
          submitting={submittingGuestName}
          onChange={setDisplayName}
          onSubmit={() => {
            if (!displayName.trim()) {
              return;
            }

            setSubmittingGuestName(true);
            void submitJoin(displayName.trim());
          }}
        />
      ) : null}

      {status === "login_required" ? (
        <LoginRequiredCard
          message={message}
          onLogin={() => router.push(`/login?redirect=${encodeURIComponent(`/join?code=${code}`)}`)}
          onBackToCurrentGroup={() => router.push(currentGroupId ? `/calendar?group=${currentGroupId}` : "/calendar")}
        />
      ) : null}

      {missingCode ? (
        <JoinErrorCard
          message="招待コードが指定されていません"
          onBack={() => router.push("/login")}
        />
      ) : null}

      {!missingCode && status === "error" ? (
        <JoinErrorCard
          message={message}
          onBack={() => router.push("/login")}
        />
      ) : null}
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinLoadingFallback />}>
      <JoinContent />
    </Suspense>
  );
}
