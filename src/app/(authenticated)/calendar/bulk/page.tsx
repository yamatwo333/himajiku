import { redirect } from "next/navigation";
import BulkShareClient from "@/components/calendar/BulkShareClient";
import { getOwnAvailabilityEntriesForMonth } from "@/lib/server/availability";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function BulkSharePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=%2Fcalendar%2Fbulk");
  }

  const initialMonth = new Date();
  const initialEntries = await getOwnAvailabilityEntriesForMonth(createAdminClient(), {
    userId: user.id,
    month: initialMonth,
  });

  return (
    <BulkShareClient
      initialEntries={initialEntries}
      initialMonthIso={initialMonth.toISOString()}
    />
  );
}
