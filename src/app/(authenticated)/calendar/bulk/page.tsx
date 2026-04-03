import { redirect } from "next/navigation";
import BulkShareClient from "@/components/calendar/BulkShareClient";
import { getCurrentMonthDateInTokyo } from "@/lib/date";
import { getE2EBulkAvailabilityEntriesForMonth, isE2EUser } from "@/lib/e2e";
import { getRequestUserId } from "@/lib/request-user";
import {
  cleanupExpiredAvailability,
  getOwnAvailabilityEntriesForMonth,
} from "@/lib/server/availability";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function BulkSharePage() {
  const userId = await getRequestUserId();
  const initialMonth = getCurrentMonthDateInTokyo();

  if (!userId) {
    redirect("/login?redirect=%2Fcalendar%2Fbulk");
  }

  if (isE2EUser(userId)) {
    return (
      <BulkShareClient
        initialEntries={getE2EBulkAvailabilityEntriesForMonth(userId)}
        initialMonthIso={initialMonth.toISOString()}
      />
    );
  }

  const supabaseAdmin = createAdminClient();
  await cleanupExpiredAvailability(supabaseAdmin);
  const initialEntries = await getOwnAvailabilityEntriesForMonth(supabaseAdmin, {
    userId,
    month: initialMonth,
  });

  return (
    <BulkShareClient
      initialEntries={initialEntries}
      initialMonthIso={initialMonth.toISOString()}
    />
  );
}
