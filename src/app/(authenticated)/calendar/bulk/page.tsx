import { redirect } from "next/navigation";
import BulkShareClient from "@/components/calendar/BulkShareClient";
import { getRequestUserId } from "@/lib/request-user";
import { getOwnAvailabilityEntriesForMonth } from "@/lib/server/availability";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function BulkSharePage() {
  const userId = await getRequestUserId();

  if (!userId) {
    redirect("/login?redirect=%2Fcalendar%2Fbulk");
  }

  const initialMonth = new Date();
  const initialEntries = await getOwnAvailabilityEntriesForMonth(createAdminClient(), {
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
