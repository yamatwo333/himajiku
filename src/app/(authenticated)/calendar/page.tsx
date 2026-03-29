"use client";

import { useState, useEffect, useCallback } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import CalendarGrid from "@/components/CalendarGrid";
import { createClient } from "@/lib/supabase/client";
import { AvailabilityWithUser } from "@/lib/types";

export default function CalendarPage() {
  const [availabilities, setAvailabilities] = useState<AvailabilityWithUser[]>(
    []
  );
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);

  const fetchAvailabilities = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    const { data } = await supabase
      .from("availability")
      .select("*, user:profiles(*)")
      .gte("date", monthStart)
      .lte("date", monthEnd);

    if (data) {
      setAvailabilities(
        data.map((row) => ({
          id: row.id,
          userId: row.user_id,
          date: row.date,
          timeSlots: row.time_slots,
          comment: row.comment,
          user: {
            id: row.user.id,
            displayName: row.user.display_name,
            avatarUrl: row.user.avatar_url,
          },
        }))
      );
    }
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => {
    fetchAvailabilities();
  }, [fetchAvailabilities]);

  return (
    <div>
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
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }}
            />
          </div>
        ) : (
          <CalendarGrid
            availabilities={availabilities}
            onMonthChange={setCurrentMonth}
          />
        )}
      </div>
    </div>
  );
}
