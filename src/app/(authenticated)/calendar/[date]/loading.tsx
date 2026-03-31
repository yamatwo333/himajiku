import PageSpinner from "@/components/PageSpinner";

export default function DayDetailLoading() {
  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center border-b px-4 py-3" style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}>
        <div className="h-6 w-6" />
        <div className="ml-3 h-5 w-24 animate-pulse rounded" style={{ backgroundColor: "var(--color-border)" }} />
      </header>
      <PageSpinner />
    </div>
  );
}
