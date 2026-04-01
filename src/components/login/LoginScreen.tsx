import { Suspense } from "react";
import BrandLogo from "@/components/BrandLogo";
import LoginActions from "@/components/login/LoginActions";
import { TIME_SLOTS } from "@/lib/types";

const MOCK_DATA: Record<string, { self: string[]; friends: string[][] }> = {
  "3": { self: ["morning"], friends: [] },
  "5": { self: [], friends: [["afternoon"]] },
  "8": { self: ["evening"], friends: [] },
  "10": { self: ["morning"], friends: [["afternoon"]] },
  "14": { self: [], friends: [["late_night"]] },
  "15": { self: ["evening"], friends: [["evening"], ["evening"]] },
  "19": { self: ["afternoon"], friends: [["morning"]] },
  "21": { self: [], friends: [["evening"]] },
};

export default function LoginScreen() {
  return (
    <div className="flex min-h-svh flex-col" style={{ backgroundColor: "var(--color-bg)" }}>
      <div className="flex flex-1 flex-col items-center px-6 pt-[calc(env(safe-area-inset-top)+2.75rem)]">
        <div className="mb-6 text-center">
          <BrandLogo variant="lockup" className="mx-auto -mb-2" />
          <p
            className="mx-auto mt-2.5 max-w-[320px] text-sm leading-relaxed"
            style={{ color: "var(--color-text-secondary)" }}
          >
            ヒマな時間をシェアして、なんとなく集まろう
          </p>
        </div>

        <div
          className="mb-6 w-full max-w-[280px] rounded-2xl border p-4 shadow-sm"
          style={{
            backgroundColor: "var(--color-surface)",
            borderColor: "var(--color-border)",
          }}
        >
          <div
            className="mb-3 text-center text-sm font-bold"
            style={{ color: "var(--color-text)" }}
          >
            4月
          </div>
          <div
            className="grid grid-cols-7 gap-1 text-center text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {["日", "月", "火", "水", "木", "金", "土"].map((day) => (
              <div key={day} className="py-0.5">
                {day}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1 text-center text-xs">
            {[
              " ",
              " ",
              "1",
              "2",
              "3",
              "4",
              "5",
              "6",
              "7",
              "8",
              "9",
              "10",
              "11",
              "12",
              "13",
              "14",
              "15",
              "16",
              "17",
              "18",
              "19",
              "20",
              "21",
            ].map((day, index) => {
              const data = MOCK_DATA[day];
              const selfSlots = data?.self ?? [];
              const friendSlots = data?.friends ?? [];
              const selfFree = selfSlots.length > 0;
              const friendCount = friendSlots.length;
              const isHot = TIME_SLOTS.some((slot) => {
                const count =
                  (selfSlots.includes(slot) ? 1 : 0) +
                  friendSlots.filter((friend) => friend.includes(slot)).length;

                return count >= 2;
              });

              return (
                <div key={`${day}-${index}`} className="flex flex-col items-center py-1">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
                    style={{
                      backgroundColor: isHot ? "var(--color-hot)" : "transparent",
                      color:
                        day === " "
                          ? "transparent"
                          : isHot
                            ? "white"
                            : "var(--color-text)",
                      fontWeight: isHot ? 700 : 400,
                    }}
                  >
                    {day || "\u00A0"}
                  </span>
                  <div className="mt-0.5 flex gap-[2px]">
                    {selfFree && (
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: "var(--color-free-self)" }}
                      />
                    )}
                    {friendCount > 0 && (
                      <div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: "var(--color-free-friend)" }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div
            className="mt-3 flex items-center justify-center gap-3 text-[10px]"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <span className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--color-free-self)" }}
              />
              自分がヒマ
            </span>
            <span className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--color-free-friend)" }}
              />
              友達がヒマ
            </span>
            <span className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: "var(--color-hot)" }}
              />
              集まったっていい
            </span>
          </div>
        </div>

        <div className="flex gap-6 text-center text-xs" style={{ color: "var(--color-text-secondary)" }}>
          <div>
            <div className="mb-1 text-xl">&#x1F4C5;</div>
            <p>ヒマをシェア</p>
          </div>
          <div>
            <div className="mb-1 text-xl">&#x1F44B;</div>
            <p>友達と共有</p>
          </div>
          <div>
            <div className="mb-1 text-xl">&#x1F514;</div>
            <p>LINEに通知</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-6">
        <Suspense fallback={<div className="mx-auto w-full max-w-xs" />}>
          <LoginActions />
        </Suspense>
      </div>
    </div>
  );
}
