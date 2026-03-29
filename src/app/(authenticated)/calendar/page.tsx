"use client";

import CalendarGrid from "@/components/CalendarGrid";
import { MOCK_AVAILABILITIES } from "@/lib/mock-data";

export default function CalendarPage() {
  return (
    <div>
      {/* Header */}
      <header
        className="sticky top-0 z-10 border-b px-4 py-3"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <h1 className="text-center text-lg font-bold">
          hima<span style={{ color: "var(--color-primary)" }}>jiku</span>
        </h1>
      </header>

      <div className="pt-4">
        <CalendarGrid availabilities={MOCK_AVAILABILITIES} />
      </div>
    </div>
  );
}
