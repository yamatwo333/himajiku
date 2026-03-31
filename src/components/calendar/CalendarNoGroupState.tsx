interface CalendarNoGroupStateProps {
  onOpenGroups: () => void;
}

export default function CalendarNoGroupState({
  onOpenGroups,
}: CalendarNoGroupStateProps) {
  return (
    <div className="px-4 pb-3">
      <div
        className="rounded-xl border p-4"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <p className="text-sm font-bold" style={{ color: "var(--color-text)" }}>
          ひとりでも先にヒマをシェアできます
        </p>
        <p
          className="mt-1 text-xs leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          グループに参加すると、友達のヒマや「集まったっていい」の表示も見られるようになります。
        </p>
        <button
          onClick={onOpenGroups}
          className="mt-3 rounded-lg px-4 py-2 text-xs font-bold text-white"
          style={{ backgroundColor: "var(--color-primary)" }}
        >
          グループを作成・参加
        </button>
      </div>
    </div>
  );
}
