"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get("code") || "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [groupName, setGroupName] = useState("");

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
          // Not logged in - redirect to login, then back here
          router.push(`/login?redirect=${encodeURIComponent(`/join?code=${code}`)}`);
          return;
        }

        if (res.ok) {
          setStatus("success");
          setGroupName(data.group?.name || "");
        } else {
          setStatus(res.status === 409 ? "success" : "error");
          setMessage(data.error || "参加に失敗しました");
          if (res.status === 409) {
            setGroupName(""); // already member
          }
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
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: "var(--color-primary)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold">
            {groupName ? `「${groupName}」に参加しました！` : "すでに参加済みです"}
          </h1>
          <button
            onClick={() => router.push("/calendar")}
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
    <Suspense>
      <JoinContent />
    </Suspense>
  );
}
