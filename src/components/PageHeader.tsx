import type { ReactNode } from "react";

interface PageHeaderProps {
  title?: string;
  onBack?: () => void;
  trailing?: ReactNode;
  backgroundColor?: string;
  children?: ReactNode;
}

export default function PageHeader({
  title,
  onBack,
  trailing,
  backgroundColor = "var(--color-surface)",
  children,
}: PageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-10 border-b px-4 py-3"
      style={{ backgroundColor, borderColor: "var(--color-border)" }}
    >
      {onBack ? (
        <div className="flex items-center">
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
          {trailing ? <div className="ml-auto">{trailing}</div> : null}
        </div>
      ) : (
        <div className="flex justify-center">{children ?? <h1 className="text-center text-lg font-bold">{title}</h1>}</div>
      )}
    </header>
  );
}
