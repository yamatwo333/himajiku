import { redirect } from "next/navigation";
import DayDetailClient from "@/components/calendar/DayDetailClient";
import { getE2EAvailabilityForDateForUser, isE2EUser } from "@/lib/e2e";
import { getRequestUserId } from "@/lib/request-user";
import { getAvailabilityForDateForUser } from "@/lib/server/availability";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function DayDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const [{ date }, { group }] = await Promise.all([params, searchParams]);
  const userId = await getRequestUserId();

  if (!userId) {
    redirect(`/login?redirect=${encodeURIComponent(`/calendar/${date}${group ? `?group=${group}` : ""}`)}`);
  }

  if (isE2EUser(userId)) {
    const result = getE2EAvailabilityForDateForUser(
      userId,
      date,
      group || undefined
    );

    if (result === null) {
      redirect("/calendar");
    }

    return (
      <DayDetailClient
        currentUserId={result.currentUserId}
        dateStr={date}
        groupId={group ?? ""}
        initialAvailabilities={result.availabilities}
      />
    );
  }

  const result = await getAvailabilityForDateForUser(createAdminClient(), {
    userId,
    groupId: group || undefined,
    date,
  });

  if (result === null) {
    redirect("/calendar");
  }

  return (
    <DayDetailClient
      currentUserId={result.currentUserId}
      dateStr={date}
      groupId={group ?? ""}
      initialAvailabilities={result.availabilities}
    />
  );
}
