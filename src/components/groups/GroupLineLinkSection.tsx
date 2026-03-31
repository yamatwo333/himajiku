const BOT_URL = "https://line.me/R/ti/p/@156samjs";

interface GroupLineLinkSectionProps {
  isOwner: boolean;
  lineLinked: boolean;
  linkCode: string | null;
  isCodeExpired: boolean;
  generatingCode: boolean;
  unlinking: boolean;
  copiedCode: boolean;
  onGenerateLinkCode: () => void;
  onUnlink: () => void;
  onCopyLinkCode: () => void;
}

export default function GroupLineLinkSection({
  isOwner,
  lineLinked,
  linkCode,
  isCodeExpired,
  generatingCode,
  unlinking,
  copiedCode,
  onGenerateLinkCode,
  onUnlink,
  onCopyLinkCode,
}: GroupLineLinkSectionProps) {
  if (!isOwner) {
    return (
      <section
        className="rounded-2xl border p-4 space-y-3"
        style={{
          borderColor: "var(--color-border)",
          backgroundColor: "var(--color-surface)",
        }}
      >
        <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
          LINE通知連携
        </h2>
        <div
          className="rounded-xl border p-3"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-bg)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
            {lineLinked ? "連携済み" : "未連携"}
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
            {lineLinked
              ? "条件を満たすと、連携先のLINEグループに通知が届きます。"
              : "LINEグループにまだ連携されていません。"}
          </p>
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          ※ 管理者のみ連携設定を変更できます
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border p-4 space-y-3"
      style={{
        borderColor: "var(--color-border)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <h2 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
        LINE通知連携
      </h2>
      {lineLinked ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl p-3" style={{ backgroundColor: "#f0fdf4" }}>
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white text-xs"
              style={{ backgroundColor: "#06C755" }}
            >
              &#x2713;
            </span>
            <span className="text-sm font-medium">連携済み</span>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            通知条件を満たすと、連携先のLINEグループに自動で通知が届きます。
          </p>
          <button onClick={onUnlink} disabled={unlinking} className="text-sm text-red-500 disabled:opacity-50">
            {unlinking ? "解除中..." : "連携を解除する"}
          </button>
        </div>
      ) : linkCode && !isCodeExpired ? (
        <div className="space-y-4">
          <p className="text-sm">LINEグループで以下を送信してください：</p>
          <div
            className="relative flex items-center justify-center rounded-xl py-4 text-xl font-bold tracking-widest"
            style={{ backgroundColor: "var(--color-bg)", color: "var(--color-primary)" }}
          >
            連携 {linkCode}
            <button
              onClick={onCopyLinkCode}
              className="absolute right-3 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: copiedCode ? "#10B981" : "var(--color-border)",
                color: copiedCode ? "white" : "var(--color-text-secondary)",
              }}
            >
              {copiedCode ? "OK!" : "コピー"}
            </button>
          </div>
          <ol className="space-y-1 text-xs list-decimal list-inside" style={{ color: "var(--color-text-secondary)" }}>
            <li>
              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: "var(--color-primary)" }}
              >
                シェアヒマ通知Bot
              </a>
              を友だち追加
            </li>
            <li>LINEグループにBotを招待</li>
            <li>そのグループで上のメッセージを送信</li>
            <li>Botが「連携完了」と返信したらOK</li>
          </ol>
          <p className="text-xs" style={{ color: "var(--color-hot)" }}>
            ※ 有効期限は10分です
          </p>
          <button onClick={onGenerateLinkCode} className="text-sm font-medium" style={{ color: "var(--color-primary)" }}>
            コードを再発行
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            LINEグループと連携すると、ヒマな人が集まった時に自動で通知が届きます。
          </p>
          <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: "var(--color-bg)" }}>
            <p className="text-xs font-bold" style={{ color: "var(--color-text)" }}>
              まずBotを友だち追加
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
              LINEグループに招待するには、先にBotを友だちに追加してください。
            </p>
            <a
              href={BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold text-white"
              style={{ backgroundColor: "#06C755" }}
            >
              友だち追加する
            </a>
          </div>
          <button
            onClick={onGenerateLinkCode}
            disabled={generatingCode}
            className="w-full rounded-xl py-3 text-sm font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
            style={{ backgroundColor: "#06C755" }}
          >
            {generatingCode ? "発行中..." : "LINE連携コードを発行"}
          </button>
        </div>
      )}
    </section>
  );
}
