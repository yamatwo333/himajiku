import { redirect } from "next/navigation";
import BulkShareClient from "@/components/calendar/BulkShareClient";
import { getCurrentMonthDateInTokyo } from "@/lib/date";
import { getE2EBulkAvailabilityEntriesForMonth, isE2EUser } from "@/lib/e2e";
import { getRequestActor } from "@/lib/request-actor";
import {
  cleanupExpiredAvailability,
  getOwnAvailabilityEntriesForActorMonth,
} from "@/lib/server/availability";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function BulkSharePage() {
  const actor = await getRequestActor();
  const initialMonth = getCurrentMonthDateInTokyo();

  if (!actor) {
    redirect("/login?redirect=%2Fcalendar%2Fbulk");
  }

  if (actor.kind === "user" && isE2EUser(actor.userId)) {
    return (
      <BulkShareClient
        initialEntries={getE2EBulkAvailabilityEntriesForMonth(actor.userId)}
        initialMonthIso={initialMonth.toISOString()}
        isGuest={false}
      />
    );
  }

  const supabaseAdmin = createAdminClient();
  await cleanupExpiredAvailability(supabaseAdmin);
  const initialEntries = await getOwnAvailabilityEntriesForActorMonth(supabaseAdmin, {
    actor,
    month: initialMonth,
  });

  return (
    <BulkShareClient
      initialEntries={initialEntries}
      initialMonthIso={initialMonth.toISOString()}
      isGuest={actor.kind === "guest"}
    />
  );
}
