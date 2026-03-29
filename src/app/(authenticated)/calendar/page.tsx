"use client";

import { useState, useEffect, useCallback } from "react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import CalendarGrid from "@/components/CalendarGrid";
import { createClient } from "@/lib/supabase/client";
import { AvailabilityWithUser } from "@/lib/types";

interface GroupInfo {
  id: string;
  name: string;
}

export default function CalendarPage() {
  const [availabilities, setAvailabilities] = useState<AvailabilityWithUser[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");

  // Fetch groups the user belongs to
  useEffect(() => {
    const fetchGroups = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      if (memberships && memberships.length > 0) {
        const groupIds = memberships.map((m) => m.group_id);
        const { data: groupsData } = await supabase
          .from("groups")
          .select("id, name")
          .in("id", groupIds);

        if (groupsData && groupsData.length > 0) {
          setGroups(groupsData);
          setSelectedGroupId(groupsData[0].id);
        }
      }
      setLoading(false);
    };
    fetchGroups();
  }, []);

  const fetchAvailabilities = useCallback(async () => {
    if (!selectedGroupId) {
      setAvailabilities([]);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");

    // Get members of the selected group
    const { data: members } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", selectedGroupId);

    if (!members || members.length === 0) {
      setAvailabilities([]);
      setLoading(false);
      return;
    }

    const memberIds = members.map((m) => m.user_id);

    const { data } = await supabase
      .from("availability")
      .select("*, user:profiles(*)")
      .in("user_id", memberIds)
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
  }, [currentMonth, selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId) {
      fetchAvailabilities();
    }
  }, [fetchAvailabilities, selectedGroupId]);

  return (
    <div>
      <header
        className="sticky top-0 z-10 border-b px-4 py-3"
        style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <h1 className="text-center text-lg font-bold">
          hima<span style={{ color: "var(--color-primary)" }}>jiku</span>
        </h1>
      </header>

      {/* Group selector */}
      {groups.length > 0 && (
        <div className="px-4 pt-3">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full rounded-xl border px-4 py-2.5 text-sm font-medium outline-none"
            style={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="pt-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--color-border)", borderTopColor: "transparent" }} />
          </div>
        ) : groups.length === 0 ? (
          <div className="px-4 py-16 text-center">
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              まだグループに参加していません
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
              「グループ」タブからグループを作成or参加してください
            </p>
          </div>
        ) : (
          <CalendarGrid
            availabilities={availabilities}
            onMonthChange={setCurrentMonth}
            groupId={selectedGroupId}
          />
        )}
      </div>
    </div>
  );
}
