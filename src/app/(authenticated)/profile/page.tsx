"use client";

import { CURRENT_USER } from "@/lib/mock-data";

export default function ProfilePage() {
  return (
    <div>
      <header
        className="sticky top-0 z-10 border-b px-4 py-3"
        style={{
          backgroundColor: "var(--color-surface)",
          borderColor: "var(--color-border)",
        }}
      >
        <h1 className="text-center text-lg font-bold">マイページ</h1>
      </header>

      <div className="space-y-6 px-4 pt-6">
        {/* User info */}
        <section className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold text-white"
            style={{ backgroundColor: "var(--color-primary)" }}
          >
            {CURRENT_USER.displayName.charAt(0)}
          </div>
          <div>
            <p className="text-lg font-bold">{CURRENT_USER.displayName}</p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              LINE連携済み
            </p>
          </div>
        </section>

        {/* Settings */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold" style={{ color: "var(--color-text-secondary)" }}>
            設定
          </h2>
          <div
            className="rounded-xl border"
            style={{
              backgroundColor: "var(--color-surface)",
              borderColor: "var(--color-border)",
            }}
          >
            <button className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm">
              <span>LINE通知設定</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="6,4 10,8 6,12" />
              </svg>
            </button>
            <hr style={{ borderColor: "var(--color-border)" }} />
            <button className="flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-red-500">
              <span>ログアウト</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
