"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [name, setName] = useState("");
  const [notifyThreshold, setNotifyThreshold] = useState(3);
  const [lineLinked, setLineLinked] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkCodeExpiresAt, setLinkCodeExpiresAt] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.group.name);
        setNotifyThreshold(data.group.notify_threshold);
        setLineLinked(!!data.group.line_group_id);
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/groups/${groupId}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        notify_threshold: notifyThreshold,
      }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleGenerateLinkCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/line-link`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLinkCode(data.code);
        setLinkCodeExpiresAt(data.expiresAt);
      }
    } catch {
      // ignore
    }
    setGeneratingCode(false);
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/line-link`, { method: "DELETE" });
      if (res.ok) {
        setLineLinked(false);
        setLinkCode(null);
      }
    } catch {
      // ignore
    }
    setUnlinking(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    router.push("/groups");
  };

  const isCodeExpired = linkCodeExpiresAt ? new Date(linkCodeExpiresAt) < new Date() : false;

  if (loading) {
    return (
      <div>
        <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <button onClick={() => router.back()} className="mr-3 rounded-lg p-1 active:bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
          </button>
          <h1 className="text-lg font-bold">グループ設定</h1>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <button onClick={() => router.back()} className="mr-3 rounded-lg p-1 active:bg-gray-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
        </button>
        <h1 className="text-lg font-bold">グループ設定</h1>
      </header>

      <div className="px-4 pt-5 pb-8 space-y-6">
        {/* Group name */}
        <section>
          <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>グループ名</h2>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)]"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          />
        </section>

        {/* Notification threshold */}
        <section>
          <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>通知の条件</h2>
          <div className="flex items-center gap-3">
            <select
              value={notifyThreshold}
              onChange={(e) => setNotifyThreshold(Number(e.target.value))}
              className="rounded-xl border px-4 py-3 text-sm outline-none"
              style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n}人以上</option>
              ))}
            </select>
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>が同じ時間帯にヒマなとき</span>
          </div>
        </section>

        {/* LINE Link */}
        <section>
          <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>LINE通知連携</h2>

          {lineLinked ? (
            // 連携済み
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "#06C755", backgroundColor: "#f0fdf4" }}>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-white text-xs" style={{ backgroundColor: "#06C755" }}>&#x2713;</span>
                <span className="text-sm font-medium">LINEグループと連携済み</span>
              </div>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                通知条件を満たすと、連携先のLINEグループに自動で通知が届きます。
              </p>
              <button
                onClick={handleUnlink}
                disabled={unlinking}
                className="text-sm text-red-500 disabled:opacity-50"
              >
                {unlinking ? "解除中..." : "連携を解除する"}
              </button>
            </div>
          ) : linkCode && !isCodeExpired ? (
            // コード発行済み
            <div className="rounded-xl border p-4 space-y-4" style={{ borderColor: "var(--color-primary)", backgroundColor: "var(--color-bg)" }}>
              <div>
                <p className="mb-2 text-sm font-medium">LINEグループで以下を送信してください：</p>
                <div className="relative flex items-center justify-center rounded-xl py-4 text-2xl font-bold tracking-widest" style={{ backgroundColor: "var(--color-surface)", color: "var(--color-primary)" }}>
                  連携 {linkCode}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`連携 ${linkCode}`);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="absolute right-3 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                    style={{ backgroundColor: copied ? "#10B981" : "var(--color-border)", color: copied ? "white" : "var(--color-text-secondary)" }}
                  >
                    {copied ? "OK!" : "コピー"}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  &#x2460; 通知を送りたいLINEグループに「シェアヒマ通知Bot」を招待
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  &#x2461; そのグループで上のメッセージをそのまま送信
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  &#x2462; Botが「連携完了」と返信したらOK！
                </p>
              </div>
              <p className="text-xs" style={{ color: "var(--color-hot)" }}>
                ※ コードの有効期限は10分です
              </p>
              <button
                onClick={handleGenerateLinkCode}
                className="text-sm font-medium"
                style={{ color: "var(--color-primary)" }}
              >
                コードを再発行する
              </button>
            </div>
          ) : (
            // 未連携
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--color-border)" }}>
              <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
                LINEグループと連携すると、ヒマな人が集まった時に自動で通知が届きます。
              </p>
              <button
                onClick={handleGenerateLinkCode}
                disabled={generatingCode}
                className="w-full rounded-xl py-3 text-sm font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
                style={{ backgroundColor: "#06C755" }}
              >
                {generatingCode ? "発行中..." : "LINE連携コードを発行"}
              </button>
            </div>
          )}
        </section>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="w-full rounded-xl py-3.5 text-base font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
          style={{ backgroundColor: saved ? "#10B981" : "var(--color-primary)" }}
        >
          {saving ? "保存中..." : saved ? "保存しました" : "設定を保存"}
        </button>

        {/* Delete */}
        <section className="pt-4">
          {showDelete ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-sm text-red-600">グループを削除すると全メンバーが外れます。元に戻せません。</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDelete(false)} className="flex-1 rounded-lg border py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>キャンセル</button>
                <button onClick={handleDelete} disabled={deleting} className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white disabled:opacity-50">
                  {deleting ? "削除中..." : "削除する"}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowDelete(true)} className="w-full rounded-xl border py-3 text-sm text-red-500" style={{ borderColor: "var(--color-border)" }}>
              グループを削除
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
