import { expect, test, type Page } from "@playwright/test";

const BASE_URL = "http://127.0.0.1:3100";
const AUTH_COOKIE_NAME = "sharehima-e2e-user-id";
const E2E_USER_ID = "e2e-user-1";
const E2E_GROUP_ID = "e2e-group-1";

async function signIn(page: Page) {
  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: E2E_USER_ID,
      url: BASE_URL,
    },
  ]);
}

test.describe("authenticated smoke flows", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("profile page renders fixture data", async ({ page }) => {
    await page.goto("/profile");

    await expect(page.getByText("E2E テストユーザー")).toBeVisible();
    await expect(page.getByText("シェアヒマとは？")).toBeVisible();
    await expect(page.getByText("このサービスをシェア")).toBeVisible();
  });

  test("groups page can create a new group with mocked API responses", async ({
    page,
  }) => {
    await page.route("**/api/groups", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          group: {
            id: "group-2",
            name: "新しいテストグループ",
          },
        }),
      });
    });

    await page.route("**/api/groups/mine", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          groups: [
            {
              id: E2E_GROUP_ID,
              name: "テストグループ",
              invite_code: "ABC123",
              created_by: E2E_USER_ID,
              notify_threshold: 2,
              member_count: 3,
            },
            {
              id: "group-2",
              name: "新しいテストグループ",
              invite_code: "XYZ789",
              created_by: E2E_USER_ID,
              notify_threshold: 2,
              member_count: 1,
            },
          ],
        }),
      });
    });

    await page.goto("/groups");

    await expect(page.getByText("テストグループ")).toBeVisible();
    await page.getByRole("button", { name: "グループを作成" }).first().click();
    await page
      .getByPlaceholder("グループ名（例: 大学メンバー）")
      .fill("新しいテストグループ");
    await page.getByRole("button", { name: "作成", exact: true }).click();

    await expect(page.getByText("新しいテストグループ")).toBeVisible();
  });

  test("group detail page renders invite and LINE settings", async ({ page }) => {
    await page.goto(`/groups/${E2E_GROUP_ID}`);

    await expect(page.getByText("友達を招待")).toBeVisible();
    await expect(page.getByText("LINE通知連携")).toBeVisible();
    await expect(page.getByText("招待コード:")).toBeVisible();
  });

  test("day detail page can save availability and return to calendar", async ({
    page,
  }) => {
    await page.route("**/api/availability", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route("**/api/availability/month?*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          availabilities: [],
          currentUserId: E2E_USER_ID,
        }),
      });
    });

    await page.goto(`/calendar/2099-12-31?group=${E2E_GROUP_ID}`);

    await page.getByRole("button", { name: "午後" }).click();
    await page.getByRole("button", { name: "ヒマをシェアする" }).click();

    await expect(page).toHaveURL(/\/calendar\?group=e2e-group-1/);
    await expect(page.getByText("ヒマをシェアしました")).toBeVisible();
  });
});
