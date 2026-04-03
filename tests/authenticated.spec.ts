import { expect, test, type Locator, type Page } from "@playwright/test";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";

const BASE_URL = "http://127.0.0.1:3100";
const AUTH_COOKIE_NAME = "sharehima-e2e-user-id";
const E2E_USER_ID = "e2e-user-1";
const E2E_GROUP_ID = "e2e-group-1";

async function signIn(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: E2E_USER_ID,
      url: BASE_URL,
    },
  ]);
}

function getBulkCardByComment(page: Page, comment: string): Locator {
  return page
    .locator(`input[value="${comment}"]`)
    .locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
}

async function performSwipe(surface: Locator, direction: "left" | "right") {
  const bounds = await surface.boundingBox();

  if (!bounds) {
    throw new Error("swipe surface not found");
  }

  const centerY = bounds.y + bounds.height / 2;
  const startX = direction === "left" ? bounds.x + bounds.width * 0.8 : bounds.x + bounds.width * 0.2;
  const endX = direction === "left" ? bounds.x + bounds.width * 0.2 : bounds.x + bounds.width * 0.8;

  await surface.dispatchEvent("pointerdown", {
    pointerType: "touch",
    pointerId: 1,
    isPrimary: true,
    clientX: startX,
    clientY: centerY,
  });
  await surface.dispatchEvent("pointermove", {
    pointerType: "touch",
    pointerId: 1,
    isPrimary: true,
    clientX: (startX + endX) / 2,
    clientY: centerY,
  });
  await surface.dispatchEvent("pointerup", {
    pointerType: "touch",
    pointerId: 1,
    isPrimary: true,
    clientX: endX,
    clientY: centerY,
  });
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

  test("group detail page autosaves owner settings", async ({ page }) => {
    await page.goto(`/groups/${E2E_GROUP_ID}`);

    const settingsRequest = page.waitForRequest(`**/api/groups/${E2E_GROUP_ID}/settings`);

    await page
      .locator('input[type="text"]:not([readonly])')
      .first()
      .fill("更新後のテストグループ");
    await page.getByRole("combobox").selectOption({ label: "4人以上" });

    const request = await settingsRequest;

    expect(request.postDataJSON()).toEqual({
      name: "更新後のテストグループ",
      notify_threshold: 4,
    });
    await expect(page.getByRole("heading", { name: "更新後のテストグループ" })).toBeVisible();
  });

  test("group detail page can generate a LINE link code", async ({ page }) => {
    await page.goto(`/groups/${E2E_GROUP_ID}`);

    await page.getByRole("button", { name: "LINE連携コードを発行" }).click();

    await expect(page.getByText("連携 E2E123")).toBeVisible();
    await expect(page.getByText("Botが「連携完了」と返信したらOK")).toBeVisible();
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

  test("calendar page changes month when swiped left", async ({ page }) => {
    await page.goto(`/calendar?group=${E2E_GROUP_ID}`);

    const swipeSurface = page.getByTestId("calendar-swipe-surface");
    const monthSelect = page.getByTestId("calendar-month-select");
    const expectedNextMonth = format(addMonths(startOfMonth(new Date()), 1), "yyyy-MM");

    await performSwipe(swipeSurface, "left");

    await expect(monthSelect).toHaveValue(expectedNextMonth);
    await expect(page).toHaveURL(new RegExp(`month=${expectedNextMonth}`));
  });

  test("calendar page does not swipe into a past month", async ({ page }) => {
    await page.goto(`/calendar?group=${E2E_GROUP_ID}`);

    const swipeSurface = page.getByTestId("calendar-swipe-surface");
    const monthSelect = page.getByTestId("calendar-month-select");
    const currentMonthValue = format(startOfMonth(new Date()), "yyyy-MM");
    const initialUrl = page.url();

    await performSwipe(swipeSurface, "right");

    await expect(monthSelect).toHaveValue(currentMonthValue);
    await expect(page).toHaveURL(initialUrl);
  });

  test("calendar page only renders buttons for the current month", async ({ page }) => {
    await page.goto(`/calendar?group=${E2E_GROUP_ID}`);

    const swipeSurface = page.getByTestId("calendar-swipe-surface");
    const currentMonthDayCount = endOfMonth(startOfMonth(new Date())).getDate();

    await expect(swipeSurface.locator("button")).toHaveCount(currentMonthDayCount);
  });

  test("bulk share keeps month inputs while swiping between months", async ({ page }) => {
    await page.goto("/calendar/bulk");

    const swipeSurface = page.getByTestId("bulk-swipe-surface");
    const monthLabel = page.getByTestId("bulk-month-label");
    const currentMonthLabel = format(startOfMonth(new Date()), "yyyy年 M月");
    const nextMonthLabel = format(addMonths(startOfMonth(new Date()), 1), "yyyy年 M月");
    const existingCommentInput = page.locator('input[value="既存のまとめてシェア"]');

    await expect(monthLabel).toHaveText(currentMonthLabel);
    await expect(existingCommentInput).toBeVisible();

    await performSwipe(swipeSurface, "left");

    await expect(monthLabel).toHaveText(nextMonthLabel);
    const nextMonthAfternoonButton = page
      .locator("button:not([disabled])")
      .filter({ hasText: "午後" })
      .first();
    await expect(nextMonthAfternoonButton).toBeVisible();
    await nextMonthAfternoonButton.click();
    await page.getByPlaceholder("ひとこと").fill("来月の入力");

    await performSwipe(swipeSurface, "right");

    await expect(monthLabel).toHaveText(currentMonthLabel);
    await expect(existingCommentInput).toBeVisible();

    await performSwipe(swipeSurface, "left");

    await expect(monthLabel).toHaveText(nextMonthLabel);
    await expect(page.locator('input[value="来月の入力"]')).toBeVisible();
  });

  test("bulk share page does not swipe into a finished month", async ({ page }) => {
    await page.goto("/calendar/bulk");

    const swipeSurface = page.getByTestId("bulk-swipe-surface");
    const monthLabel = page.getByTestId("bulk-month-label");
    const currentMonthLabel = format(startOfMonth(new Date()), "yyyy年 M月");

    await performSwipe(swipeSurface, "right");

    await expect(monthLabel).toHaveText(currentMonthLabel);
  });

  test("bulk share page can save selected dates and return to calendar", async ({
    page,
  }) => {
    await page.goto("/calendar/bulk");
    const existingCard = getBulkCardByComment(page, "既存のまとめてシェア");

    await expect(existingCard).toBeVisible();

    const bulkSaveRequest = page.waitForRequest("**/api/availability/bulk");

    await existingCard.getByRole("button", { name: "午前" }).click();
    await expect(page.locator('input[value="既存のまとめてシェア"]')).toHaveCount(0);
    await page.getByRole("button", { name: "まとめてシェアする" }).click();

    const request = await bulkSaveRequest;

    expect(request.postDataJSON()).toMatchObject({
      entries: [],
    });
    expect(request.postDataJSON().start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(request.postDataJSON().end).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await expect(page).toHaveURL(/\/calendar(?:\?.*)?$/);
    await expect(page.getByText("ヒマをシェアしました")).toBeVisible();
  });
});
