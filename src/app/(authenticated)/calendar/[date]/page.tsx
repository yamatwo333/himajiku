import { redirect } from "next/navigation";
import DayDetailClient from "@/components/calendar/DayDetailClient";
import { getE2EAvailabilityForDateForUser, isE2EUser } from "@/lib/e2e";
import { getRequestActor } from "@/lib/request-actor";
import { getAvailabilityForDateForActor } from "@/lib/server/availability";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function DayDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ date: string }>;
  searchParams: Promise<{ group?: string }>;
  }) {
  const [{ date }, { group }] = await Promise.all([params, searchParams]);
  const actor = await getRequestActor();

  if (!actor) {
    redirect(`/login?redirect=${encodeURIComponent(`/calendar/${date}${group ? `?group=${group}` : ""}`)}`);
  }

  if (actor.kind === "user" && isE2EUser(actor.userId)) {
    const result = getE2EAvailabilityForDateForUser(
      actor.userId,
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
        isGuest={false}
      />
    );
  }

  const result = await getAvailabilityForDateForActor(createAdminClient(), {
    actor,
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
      groupId={group || (actor.kind === "guest" ? actor.groupId : "")}
      initialAvailabilities={result.availabilities}
      isGuest={actor.kind === "guest"}
    />
  );
}
