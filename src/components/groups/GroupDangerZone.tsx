interface GroupDangerZoneProps {
  isOwner: boolean;
  memberCount: number;
  showConfirm: boolean;
  leaving: boolean;
  deleting: boolean;
  onOpenConfirm: () => void;
  onCloseConfirm: () => void;
  onLeave: () => void;
  onDelete: () => void;
}

export default function GroupDangerZone({
  isOwner,
  memberCount,
  showConfirm,
  leaving,
  deleting,
  onOpenConfirm,
  onCloseConfirm,
  onLeave,
  onDelete,
}: GroupDangerZoneProps) {
  const shouldDeleteGroup = isOwner && memberCount <= 1;

  return (
    <section data-testid="group-danger-zone">
      {showConfirm ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm text-red-600">
            {shouldDeleteGroup
              ? "グループを削除すると元に戻せません。"
              : "本当にこのグループを退出しますか？"}
          </p>
          {isOwner && memberCount > 1 ? (
            <p className="text-xs text-red-500">
              管理者は自動的に他のメンバーに引き継がれます。
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              onClick={onCloseConfirm}
              className="flex-1 rounded-lg border py-2 text-sm"
              style={{ borderColor: "var(--color-border)" }}
            >
              キャンセル
            </button>
            {shouldDeleteGroup ? (
              <button
                onClick={onDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {deleting ? "削除中..." : "削除する"}
              </button>
            ) : (
              <button
                onClick={onLeave}
                disabled={leaving}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {leaving ? "退出中..." : "退出する"}
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={onOpenConfirm}
          className="w-full rounded-xl border py-3 text-sm text-red-500"
          style={{ borderColor: "var(--color-border)" }}
        >
          {shouldDeleteGroup ? "グループを削除" : "グループを退出"}
        </button>
      )}
    </section>
  );
}
