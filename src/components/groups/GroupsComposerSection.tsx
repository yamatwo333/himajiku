import CharacterSticker from "@/components/CharacterSticker";
import { CHARACTER_ASSETS } from "@/lib/characters";

type ComposerMode = "create" | "join" | null;

interface GroupsComposerSectionProps {
  activeMode: ComposerMode;
  groupName: string;
  inviteCode: string;
  error: string;
  submitting: boolean;
  onSelectMode: (mode: Exclude<ComposerMode, null>) => void;
  onClose: () => void;
  onGroupNameChange: (value: string) => void;
  onInviteCodeChange: (value: string) => void;
  onCreate: () => void;
  onJoin: () => void;
}

export default function GroupsComposerSection({
  activeMode,
  groupName,
  inviteCode,
  error,
  submitting,
  onSelectMode,
  onClose,
  onGroupNameChange,
  onInviteCodeChange,
  onCreate,
  onJoin,
}: GroupsComposerSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex gap-3">
        <button
          onClick={() => onSelectMode("create")}
          className="flex-1 rounded-xl py-3 text-sm font-bold text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          グループを作成
        </button>
        <button
          onClick={() => onSelectMode("join")}
          className="flex-1 rounded-xl border py-3 text-sm font-bold"
          style={{
            borderColor: "var(--color-primary)",
            color: "var(--color-primary)",
          }}
        >
          招待コードで参加
        </button>
      </div>

      {activeMode === "create" ? (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                新しいグループ
              </h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                グループを作ったあとで、招待リンクや招待コードを友だちに送れます。
              </p>
            </div>
            <CharacterSticker
              src={CHARACTER_ASSETS.cheerCloud.src}
              alt={CHARACTER_ASSETS.cheerCloud.alt}
              className="h-12 w-auto shrink-0 object-contain"
            />
          </div>
          <input
            type="text"
            value={groupName}
            onChange={(event) => onGroupNameChange(event.target.value)}
            placeholder="グループ名（例: 大学メンバー）"
            maxLength={30}
            className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[var(--color-primary)]"
            style={{ borderColor: "var(--color-border)" }}
          />
          {error ? <p className="text-xs text-red-500" role="alert">{error}</p> : null}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            >
              キャンセル
            </button>
            <button
              onClick={onCreate}
              disabled={submitting || !groupName.trim()}
              className="flex-1 rounded-lg py-2 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {submitting ? "作成中..." : "作成"}
            </button>
          </div>
        </div>
      ) : null}

      {activeMode === "join" ? (
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
                招待コードで参加
              </h3>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                6文字のコードを入力すると、すぐにグループへ参加できます。
              </p>
            </div>
            <CharacterSticker
              src={CHARACTER_ASSETS.cheerCloud.src}
              alt={CHARACTER_ASSETS.cheerCloud.alt}
              className="h-12 w-auto shrink-0 object-contain"
            />
          </div>
          <input
            type="text"
            value={inviteCode}
            onChange={(event) => onInviteCodeChange(event.target.value.toUpperCase())}
            placeholder="招待コード（6文字）"
            maxLength={6}
            className="w-full rounded-lg border px-3 py-2.5 text-center text-lg font-mono tracking-widest outline-none focus:border-[var(--color-primary)]"
            style={{ borderColor: "var(--color-border)" }}
          />
          {error ? <p className="text-xs text-red-500" role="alert">{error}</p> : null}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            >
              キャンセル
            </button>
            <button
              onClick={onJoin}
              disabled={submitting || inviteCode.length < 6}
              className="flex-1 rounded-lg py-2 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: "var(--color-primary)" }}
            >
              {submitting ? "参加中..." : "参加"}
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
