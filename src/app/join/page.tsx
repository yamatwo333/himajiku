"use client";

import CharacterSticker from "@/components/CharacterSticker";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState, useRef } from "react";
import { CHARACTER_ASSETS } from "@/lib/characters";

function JoinLoadingFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
        <p className="mt-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>招待情報を確認中...</p>
      </div>
    </div>
  );
}

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupId, setGroupId] = useState("");
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setMessage("招待コードが指定されていません");
      return;
    }

    const join = async () => {
      try {
        const res = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invite_code: code }),
        });

        const data = await res.json();

        if (res.status === 401) {
          // セッション未確立の可能性 → リトライ（最大3回）
          if (retryCountRef.current < 3) {
            retryCountRef.current++;
            setTimeout(join, 1000);
            return;
          }
          // リトライ上限 → ログインへリダイレクト
          router.push(`/login?redirect=${encodeURIComponent(`/join?code=${code}`)}`);
          return;
        }

        if (res.ok) {
          setStatus("success");
          setGroupName(data.group?.name || "");
          setGroupId(data.group?.id || "");
        } else {
          setStatus(res.status === 409 ? "success" : "error");
          setMessage(data.error || "参加に失敗しました");
          setGroupName(data.group?.name || "");
          setGroupId(data.group?.id || "");
        }
      } catch {
        setStatus("error");
        setMessage("エラーが発生しました");
      }
    };

    join();
  }, [code, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      {status === "loading" && (
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
          <p className="mt-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>グループに参加中...</p>
        </div>
      )}

      {status === "success" && (
        <div className="text-center">
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

      {status === "error" && (
        <div className="text-center">
          <p className="text-sm text-red-500">{message}</p>
          <button
            onClick={() => router.push("/groups")}
            className="mt-6 rounded-xl border px-8 py-3 text-sm"
            style={{ borderColor: "var(--color-border)" }}
          >
            戻る
          </button>
        </div>
      )}
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
