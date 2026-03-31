interface CalendarGroupSelectorProps<T extends { id: string; name: string }> {
  groups: T[];
  selectedGroupId: string;
  onChange: (groupId: string) => void;
}

export default function CalendarGroupSelector<T extends { id: string; name: string }>({
  groups,
  selectedGroupId,
  onChange,
}: CalendarGroupSelectorProps<T>) {
  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pt-3">
      <select
        value={selectedGroupId}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border px-4 py-2.5 text-sm font-medium outline-none"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        {groups.map((group) => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>
    </div>
  );
}
