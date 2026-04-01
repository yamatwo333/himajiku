interface GroupSettingsSectionProps {
  isOwner: boolean;
  groupName: string;
  editName: string;
  notifyThreshold: number;
  onEditNameChange: (value: string) => void;
  onNotifyThresholdChange: (value: number) => void;
  onOpenCalendar: () => void;
}

export default function GroupSettingsSection({
  isOwner,
  groupName,
  editName,
  notifyThreshold,
  onEditNameChange,
  onNotifyThresholdChange,
  onOpenCalendar,
}: GroupSettingsSectionProps) {
  if (isOwner) {
    return (
      <>
        <section>
          <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
            グループ名
          </h2>
          <input
            type="text"
            value={editName}
            onChange={(event) => onEditNameChange(event.target.value)}
            maxLength={30}
            className="w-full rounded-xl border px-4 py-3 text-sm outline-none focus:border-[var(--color-primary)]"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
            「集まったっていい」の条件
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={notifyThreshold}
              onChange={(event) => onNotifyThresholdChange(Number(event.target.value))}
              className="rounded-xl border px-4 py-3 text-base font-medium outline-none"
              style={{
                backgroundColor: "var(--color-surface)",
                borderColor: "var(--color-border)",
                minWidth: "110px",
              }}
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => (
                <option key={count} value={count}>
                  {count}人以上
                </option>
              ))}
            </select>
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              ヒマが重なったら
            </span>
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            ※ カレンダーの
            <span
              className="inline-block h-2 w-2 rounded-full align-middle"
              style={{ backgroundColor: "var(--color-hot)" }}
            />{" "}
            マークとLINE通知の基準になります
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
            ※ 設定は自動で保存されます
          </p>
        </section>

        <button
          onClick={onOpenCalendar}
          className="w-full rounded-xl border px-4 py-3 text-sm font-medium"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
            color: "var(--color-primary)",
          }}
        >
          このグループのカレンダーを見る
        </button>
      </>
    );
  }

  return (
    <>
      <section>
        <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
          グループ名
        </h2>
        <div
          className="w-full rounded-xl border px-4 py-3 text-sm"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          {groupName}
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          ※ 管理者のみ変更できます
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
          「集まったっていい」の条件
        </h2>
        <div
          className="rounded-xl border px-4 py-3 text-sm"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          {notifyThreshold}人以上がヒマ
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          ※ カレンダーの
          <span
            className="inline-block h-2 w-2 rounded-full align-middle"
            style={{ backgroundColor: "var(--color-hot)" }}
          />{" "}
          マークとLINE通知の基準です
        </p>
      </section>

      <button
        onClick={onOpenCalendar}
        className="w-full rounded-xl border px-4 py-3 text-sm font-medium"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
          color: "var(--color-primary)",
        }}
      >
        このグループのカレンダーを見る
      </button>
    </>
  );
}
