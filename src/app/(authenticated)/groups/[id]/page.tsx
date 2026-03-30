"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

interface GroupDetail {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  notify_threshold: number;
  line_group_id: string | null;
}

interface Member {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  joined_at: string;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  // Settings state
  const [editName, setEditName] = useState("");
  const [notifyThreshold, setNotifyThreshold] = useState(3);
  const [lineLinked, setLineLinked] = useState(false);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkCodeExpiresAt, setLinkCodeExpiresAt] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const res = await fetch(`/api/groups/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setGroup(data.group);
        setMembers(data.members || []);
        setEditName(data.group.name);
        setNotifyThreshold(data.group.notify_threshold);
        setLineLinked(!!data.group.line_group_id);
      }
    } catch {
      // ignore
    }
    setLoading(false);
    setTimeout(() => { initialLoadRef.current = false; }, 100);
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-save name & threshold
  useEffect(() => {
    if (initialLoadRef.current || loading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      if (!editName.trim()) return;
      setSaving(true);
      await fetch(`/api/groups/${groupId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), notify_threshold: notifyThreshold }),
      });
      setSaving(false);
    }, 500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [editName, notifyThreshold, groupId, loading]);

  const handleCopyCode = async () => {
    if (!group) return;
    try { await navigator.clipboard.writeText(group.invite_code); } catch {
      const input = document.createElement("input");
      input.value = group.invite_code;
      document.body.appendChild(input); input.select(); document.execCommand("copy"); document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = async () => {
    if (!group) return;
    const url = `${window.location.origin}/join?code=${group.invite_code}`;
    try { await navigator.clipboard.writeText(url); } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input); input.select(); document.execCommand("copy"); document.body.removeChild(input);
    }
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleShare = async () => {
    if (!group) return;
    const url = `${window.location.origin}/join?code=${group.invite_code}`;
    if (navigator.share) {
      try { await navigator.share({ title: `シェアヒマ - ${group.name}`, text: `「${group.name}」に参加しよう！`, url }); } catch { /* cancelled */ }
    } else {
      handleCopyUrl();
    }
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
    } catch { /* ignore */ }
    setGeneratingCode(false);
  };

  const handleUnlink = async () => {
    setUnlinking(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/line-link`, { method: "DELETE" });
      if (res.ok) { setLineLinked(false); setLinkCode(null); }
    } catch { /* ignore */ }
    setUnlinking(false);
  };

  const handleTransfer = async (newOwnerId: string) => {
    setTransferring(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_owner_id: newOwnerId }),
      });
      if (res.ok) {
        setTransferTarget(null);
        fetchData();
      }
    } catch { /* ignore */ }
    setTransferring(false);
  };

  const handleLeave = async () => {
    setLeaving(true);
    await fetch(`/api/groups/${groupId}/leave`, { method: "POST" });
    router.push("/groups");
  };

  const handleDelete = async () => {
    setDeleting(true);
    await fetch(`/api/groups/${groupId}`, { method: "DELETE" });
    router.push("/groups");
  };

  const isOwner = group?.created_by === currentUserId;
  const isCodeExpired = linkCodeExpiresAt ? new Date(linkCodeExpiresAt) < new Date() : false;

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/groups");
    }
  };

  if (loading) {
    return (
      <div>
        <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <button onClick={handleBack} className="mr-3 rounded-lg p-1 active:bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
          </button>
        </header>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div>
        <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <button onClick={handleBack} className="mr-3 rounded-lg p-1 active:bg-gray-100">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
          </button>
        </header>
        <p className="py-20 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>グループが見つかりません</p>
      </div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <button onClick={handleBack} className="mr-3 rounded-lg p-1 active:bg-gray-100">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15,6 9,12 15,18" /></svg>
        </button>
        <h1 className="text-lg font-bold">{group.name}</h1>
        {saving && <span className="ml-auto text-xs" style={{ color: "var(--color-text-secondary)" }}>保存中...</span>}
      </header>

      <div className="px-4 pt-5 pb-8 space-y-6">
        {/* Invite */}
        <section className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
          <h2 className="text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>友達を招待</h2>
          <button onClick={handleShare} className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-white" style={{ backgroundColor: "var(--color-primary)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            招待リンクを共有
          </button>
          <div className="flex items-center gap-2">
            <input type="text" readOnly value={`${typeof window !== "undefined" ? window.location.origin : ""}/join?code=${group.invite_code}`}
              className="flex-1 rounded-lg border px-3 py-2 text-xs font-mono outline-none" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }} />
            <button onClick={handleCopyUrl} className="shrink-0 rounded-lg border px-3 py-2 text-xs font-bold"
              style={{ borderColor: copiedUrl ? "var(--color-primary)" : "var(--color-border)", color: copiedUrl ? "var(--color-primary)" : "var(--color-text)" }}>
              {copiedUrl ? "コピー済" : "コピー"}
            </button>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>招待コード: </span>
              <span className="font-mono font-bold tracking-widest">{group.invite_code}</span>
            </div>
            <button onClick={handleCopyCode} className="rounded-lg border px-2 py-1 text-xs"
              style={{ borderColor: copied ? "var(--color-primary)" : "var(--color-border)", color: copied ? "var(--color-primary)" : "var(--color-text-secondary)" }}>
              {copied ? "コピー済" : "コピー"}
            </button>
          </div>
        </section>

        {/* Members */}
        <section>
          <h2 className="mb-3 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>メンバー ({members.length}人)</h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 rounded-xl border p-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt={m.display_name} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: "var(--color-primary)" }}>
                    {m.display_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium">{m.display_name}</p>
                  {m.user_id === group.created_by && <span className="text-xs" style={{ color: "var(--color-primary)" }}>管理者</span>}
                </div>
                <div className="flex items-center gap-2">
                  {m.user_id === currentUserId && <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>あなた</span>}
                  {isOwner && m.user_id !== currentUserId && (
                    <button
                      onClick={() => setTransferTarget(transferTarget === m.user_id ? null : m.user_id)}
                      className="rounded-lg border px-2 py-1 text-[10px]"
                      style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                    >
                      管理者にする
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {/* Transfer confirm */}
          {transferTarget && (
            <div className="mt-2 rounded-xl border p-3 space-y-2" style={{ borderColor: "var(--color-primary)", backgroundColor: "var(--color-bg)" }}>
              <p className="text-sm">
                <span className="font-bold">{members.find(m => m.user_id === transferTarget)?.display_name}</span>
                を管理者にしますか？
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>あなたは管理者ではなくなりますが、メンバーとして残ります。</p>
              <div className="flex gap-2">
                <button onClick={() => setTransferTarget(null)} className="flex-1 rounded-lg border py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>キャンセル</button>
                <button onClick={() => handleTransfer(transferTarget)} disabled={transferring} className="flex-1 rounded-lg py-2 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: "var(--color-primary)" }}>
                  {transferring ? "変更中..." : "変更する"}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Owner settings */}
        {isOwner && (
          <>
            <section>
              <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>グループ名</h2>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={30}
                className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)]"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }} />
            </section>

            <section>
              <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>「集まったっていい」の条件</h2>
              <div className="flex items-center gap-3">
                <select value={notifyThreshold} onChange={(e) => setNotifyThreshold(Number(e.target.value))}
                  className="rounded-xl border px-4 py-3 text-base font-medium outline-none" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", minWidth: "110px" }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (<option key={n} value={n}>{n}人以上</option>))}
                </select>
                <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>ヒマが重なったら</span>
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>※ カレンダーの<span className="inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: "var(--color-hot)" }} />マークとLINE通知の基準になります</p>
              <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>※ 設定は自動で保存されます</p>
            </section>

            <section className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>LINE通知連携</h2>
              {lineLinked ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-xl p-3" style={{ backgroundColor: "#f0fdf4" }}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-xs" style={{ backgroundColor: "#06C755" }}>&#x2713;</span>
                    <span className="text-sm font-medium">連携済み</span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>通知条件を満たすと、連携先のLINEグループに自動で通知が届きます。</p>
                  <button onClick={handleUnlink} disabled={unlinking} className="text-sm text-red-500 disabled:opacity-50">
                    {unlinking ? "解除中..." : "連携を解除する"}
                  </button>
                </div>
              ) : linkCode && !isCodeExpired ? (
                <div className="space-y-4">
                  <p className="text-sm">LINEグループで以下を送信してください：</p>
                  <div className="relative flex items-center justify-center rounded-xl py-4 text-xl font-bold tracking-widest" style={{ backgroundColor: "var(--color-bg)", color: "var(--color-primary)" }}>
                    連携 {linkCode}
                    <button onClick={() => { navigator.clipboard.writeText(`連携 ${linkCode}`); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }}
                      className="absolute right-3 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
                      style={{ backgroundColor: copiedCode ? "#10B981" : "var(--color-border)", color: copiedCode ? "white" : "var(--color-text-secondary)" }}>
                      {copiedCode ? "OK!" : "コピー"}
                    </button>
                  </div>
                  <ol className="space-y-1 text-xs list-decimal list-inside" style={{ color: "var(--color-text-secondary)" }}>
                    <li><a href="https://line.me/R/ti/p/@156samjs" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: "var(--color-primary)" }}>シェアヒマ通知Bot</a>を友だち追加</li>
                    <li>LINEグループにBotを招待</li>
                    <li>そのグループで上のメッセージを送信</li>
                    <li>Botが「連携完了」と返信したらOK</li>
                  </ol>
                  <p className="text-xs" style={{ color: "var(--color-hot)" }}>※ 有効期限は10分です</p>
                  <button onClick={handleGenerateLinkCode} className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>コードを再発行</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>LINEグループと連携すると、ヒマな人が集まった時に自動で通知が届きます。</p>
                  <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: "var(--color-bg)" }}>
                    <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>まずBotを友だち追加</p>
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>LINEグループに招待するには、先にBotを友だちに追加してください。</p>
                    <a href="https://line.me/R/ti/p/@156samjs" target="_blank" rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-white" style={{ backgroundColor: "#06C755" }}>
                      友だち追加する
                    </a>
                  </div>
                  <button onClick={handleGenerateLinkCode} disabled={generatingCode}
                    className="w-full rounded-xl py-3 text-sm font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50" style={{ backgroundColor: "#06C755" }}>
                    {generatingCode ? "発行中..." : "LINE連携コードを発行"}
                  </button>
                </div>
              )}
            </section>
          </>
        )}

        {!isOwner && (
          <>
            <section>
              <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>グループ名</h2>
              <div
                className="w-full rounded-xl border px-4 py-3 text-sm"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                {group.name}
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>※ 管理者のみ変更できます</p>
            </section>

            <section>
              <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>「集まったっていい」の条件</h2>
              <div
                className="rounded-xl border px-4 py-3 text-sm"
                style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
              >
                {notifyThreshold}人以上がヒマ
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>※ カレンダーの<span className="inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: "var(--color-hot)" }} />マークとLINE通知の基準です</p>
            </section>

            <section className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface)" }}>
              <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>LINE通知連携</h2>
              <div className="rounded-xl border p-3" style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-bg)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
                  {lineLinked ? "連携済み" : "未連携"}
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {lineLinked
                    ? "条件を満たすと、連携先のLINEグループに通知が届きます。"
                    : "LINEグループにまだ連携されていません。"}
                </p>
              </div>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>※ 管理者のみ連携設定を変更できます</p>
            </section>
          </>
        )}

        {/* Leave / Delete */}
        <section>
          {showDeleteConfirm ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
              <p className="text-sm text-red-600">{isOwner && members.length <= 1 ? "グループを削除すると元に戻せません。" : "本当にこのグループを退出しますか？"}</p>
              {isOwner && members.length > 1 && (
                <p className="text-xs text-red-500">管理者は自動的に他のメンバーに引き継がれます。</p>
              )}
              <div className="flex gap-2">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 rounded-lg border py-2 text-sm" style={{ borderColor: "var(--color-border)" }}>キャンセル</button>
                {isOwner && members.length <= 1 ? (
                  <button onClick={handleDelete} disabled={deleting} className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white disabled:opacity-50">
                    {deleting ? "削除中..." : "削除する"}
                  </button>
                ) : (
                  <button onClick={handleLeave} disabled={leaving} className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white disabled:opacity-50">
                    {leaving ? "退出中..." : "退出する"}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button onClick={() => setShowDeleteConfirm(true)} className="w-full rounded-xl border py-3 text-sm text-red-500" style={{ borderColor: "var(--color-border)" }}>
              {isOwner && members.length <= 1 ? "グループを削除" : "グループを退出"}
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
