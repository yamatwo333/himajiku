import { startOfMonth } from "date-fns";
import { redirect } from "next/navigation";
import BulkShareClient from "@/components/calendar/BulkShareClient";
import { isE2EUser } from "@/lib/e2e";
import { getRequestUserId } from "@/lib/request-user";
import { getOwnAvailabilityEntriesForMonth } from "@/lib/server/availability";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function BulkSharePage() {
  const userId = await getRequestUserId();
  const initialMonth = startOfMonth(new Date());

  if (!userId) {
    redirect("/login?redirect=%2Fcalendar%2Fbulk");
  }

  if (isE2EUser(userId)) {
    return (
      <BulkShareClient
        initialEntries={{}}
        initialMonthIso={initialMonth.toISOString()}
      />
    );
  }

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
