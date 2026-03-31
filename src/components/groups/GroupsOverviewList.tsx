import Link from "next/link";
import type { GroupSummary } from "@/components/groups/types";
import PageSpinner from "@/components/PageSpinner";

interface GroupsOverviewListProps {
  groups: GroupSummary[];
  loading: boolean;
}

export default function GroupsOverviewList({
  groups,
  loading,
}: GroupsOverviewListProps) {
  if (loading) {
    return <PageSpinner className="flex items-center justify-center py-16" />;
  }

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          まだグループに参加していません
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          上のボタンからグループを作成するか、
          <br />
          招待コードで参加しましょう
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <Link
          key={group.id}
          href={`/groups/${group.id}`}
          className="flex w-full items-center justify-between rounded-xl border p-4 text-left transition-colors active:bg-gray-50"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div>
            <p className="font-bold">{group.name}</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              {group.member_count}人参加
            </p>
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <polyline points="6,4 10,8 6,12" />
          </svg>
        </Link>
      ))}
    </div>
  );
}
