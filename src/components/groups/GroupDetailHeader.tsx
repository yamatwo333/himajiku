interface GroupDetailHeaderProps {
  title?: string;
  saving?: boolean;
  onBack: () => void;
}

export default function GroupDetailHeader({
  title,
  saving = false,
  onBack,
}: GroupDetailHeaderProps) {
  return (
    <header
      className="sticky top-0 z-10 flex items-center border-b px-4 py-3"
      style={{
        backgroundColor: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      <button onClick={onBack} className="mr-3 rounded-lg p-1 active:bg-gray-100">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <polyline points="15,6 9,12 15,18" />
        </svg>
      </button>
      {title ? <h1 className="text-lg font-bold">{title}</h1> : null}
      {saving ? (
        <span className="ml-auto text-xs" style={{ color: "var(--color-text-secondary)" }}>
          保存中...
        </span>
      ) : null}
    </header>
  );
}
