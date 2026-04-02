import { addDays, format } from "date-fns";
import type { User } from "@supabase/supabase-js";
import type { AvailabilityWithUser } from "@/lib/types";

export const E2E_AUTH_COOKIE_NAME = "sharehima-e2e-user-id";

const E2E_PRIMARY_USER_ID = "e2e-user-1";
const E2E_GROUP_ID = "e2e-group-1";

function getFixtureDate() {
  return format(addDays(new Date(), 5), "yyyy-MM-dd");
}

function buildFixtureAvailabilities(userId: string, date: string): AvailabilityWithUser[] {
  return [
    {
      id: `${date}-self`,
      userId,
      date,
      timeSlots: ["morning"],
      comment: "ランチなら行けます",
      user: {
        id: userId,
        displayName: "E2E テストユーザー",
        avatarUrl: null,
      },
    },
    {
      id: `${date}-friend`,
      userId: "e2e-friend-1",
      date,
      timeSlots: ["afternoon", "evening"],
      comment: "夕方からなら参加できます",
      user: {
        id: "e2e-friend-1",
        displayName: "テストフレンド",
        avatarUrl: null,
      },
    },
  ];
}

export function isE2EAuthBypassEnabled() {
  return process.env.E2E_AUTH_BYPASS === "1";
}

export function getE2EUserId(cookieValue?: string | null) {
  if (!isE2EAuthBypassEnabled()) {
    return null;
  }

  if (!cookieValue || !cookieValue.startsWith("e2e-")) {
    return null;
  }

  return cookieValue;
}

export function isE2EUser(userId?: string | null) {
  return Boolean(userId && getE2EUserId(userId) === userId);
}

export function createE2ERouteUser(userId: string): User {
  return {
    id: userId,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00.000Z",
  } as User;
}

export function getE2EProfile(userId: string) {
  if (!isE2EUser(userId)) {
    return null;
  }

  return {
    display_name: "E2E テストユーザー",
    avatar_url: null,
  };
}

export function getE2EGroupSummaries(userId: string) {
  if (!isE2EUser(userId)) {
    return [];
  }

  return [
    {
      id: E2E_GROUP_ID,
      name: "テストグループ",
      invite_code: "ABC123",
      created_by: E2E_PRIMARY_USER_ID,
      notify_threshold: 2,
      member_count: 3,
    },
  ];
}

export function getE2EGroupDetail(userId: string, groupId: string) {
  if (!isE2EUser(userId) || groupId !== E2E_GROUP_ID) {
    return null;
  }

  return {
    group: {
      id: E2E_GROUP_ID,
      name: "テストグループ",
      invite_code: "ABC123",
      created_by: E2E_PRIMARY_USER_ID,
      notify_threshold: 2,
      line_group_id: null,
    },
    members: [
      {
        user_id: E2E_PRIMARY_USER_ID,
        display_name: "E2E テストユーザー",
        avatar_url: null,
        joined_at: "2026-01-01T00:00:00.000Z",
      },
      {
        user_id: "e2e-friend-1",
        display_name: "テストフレンド",
        avatar_url: null,
        joined_at: "2026-01-02T00:00:00.000Z",
      },
      {
        user_id: "e2e-friend-2",
        display_name: "もうひとりの友だち",
        avatar_url: null,
        joined_at: "2026-01-03T00:00:00.000Z",
      },
    ],
  };
}

export function getE2EAvailabilityRangeForUser(userId: string, groupId?: string) {
  if (!isE2EUser(userId)) {
    return null;
  }

  if (groupId && groupId !== E2E_GROUP_ID) {
    return null;
  }

  return {
    availabilities: buildFixtureAvailabilities(userId, getFixtureDate()),
    currentUserId: userId,
  };
}

export function getE2EAvailabilityForDateForUser(
  userId: string,
  date: string,
  groupId?: string
) {
  if (!isE2EUser(userId)) {
    return null;
  }

  if (groupId && groupId !== E2E_GROUP_ID) {
    return null;
  }

  return {
    availabilities: buildFixtureAvailabilities(userId, date),
    currentUserId: userId,
  };
}

export function getE2EGroupId() {
  return E2E_GROUP_ID;
}
