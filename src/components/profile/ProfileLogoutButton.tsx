"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileLogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <section>
      <button
        onClick={handleLogout}
        className="w-full rounded-xl border py-3 text-sm text-red-500"
        style={{ borderColor: "var(--color-border)" }}
      >
        ログアウト
      </button>
    </section>
  );
}
