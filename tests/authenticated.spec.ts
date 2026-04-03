import { expect, test, type Page } from "@playwright/test";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import {
  E2E_GROUP_ID,
  E2E_LINKED_GROUP_ID,
  E2E_USER_ID,
  TEST_NOW,
  getBulkCardByComment,
  performSwipe,
  readStubClipboard,
  signIn,
  stubClipboard,
} from "./helpers/e2e";

async function pinStoredCalendarMonth(page: Page) {
  await page.addInitScript((monthIso) => {
    window.sessionStorage.setItem("calendarMonth", monthIso);
  }, startOfMonth(TEST_NOW).toISOString());
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

  test("groups page shows a create error when the API rejects the new group", async ({
    page,
  }) => {
    await page.route("**/api/groups", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "同じ名前のグループがすでにあります",
        }),
      });
    });

    await page.goto("/groups");

    await page.getByRole("button", { name: "グループを作成" }).first().click();
    await page
      .getByPlaceholder("グループ名（例: 大学メンバー）")
      .fill("テストグループ");
    await page.getByRole("button", { name: "作成", exact: true }).click();

    await expect(page.getByText("同じ名前のグループがすでにあります")).toBeVisible();
    await expect(page.getByRole("button", { name: "作成", exact: true })).toBeEnabled();
  });

  test("groups page shows a join error when the invite code is invalid", async ({ page }) => {
    await page.route("**/api/groups/join", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: "招待コードが見つかりません",
        }),
      });
    });

    await page.goto("/groups");

    await page.getByRole("button", { name: "招待コードで参加" }).click();
    await page.getByPlaceholder("招待コード（6文字）").fill("ab12cd");
    const joinRequestPromise = page.waitForRequest("**/api/groups/join");
    await page.getByRole("button", { name: "参加", exact: true }).click();

    const joinRequest = await joinRequestPromise;
    expect(joinRequest.postDataJSON()).toEqual({ invite_code: "AB12CD" });
    await expect(page.getByText("招待コードが見つかりません")).toBeVisible();
    await expect(page.getByRole("button", { name: "参加", exact: true })).toBeEnabled();
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
    await page.route(`**/api/groups/${E2E_GROUP_ID}/line-link`, async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: "E2E123",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }),
      });
    });

    await page.goto(`/groups/${E2E_GROUP_ID}`);

    await page.getByRole("button", { name: "LINE連携コードを発行" }).click();

    await expect(page.getByText("連携 E2E123")).toBeVisible();
    await expect(page.getByText("Botが「連携完了」と返信したらOK")).toBeVisible();
  });

  test("group detail page can copy a LINE link code", async ({ page }) => {
    await stubClipboard(page);
    await page.route(`**/api/groups/${E2E_GROUP_ID}/line-link`, async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code: "E2E123",
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }),
      });
    });

    await page.goto(`/groups/${E2E_GROUP_ID}`);
    await page.getByRole("button", { name: "LINE連携コードを発行" }).click();

    const lineLinkSection = page.getByTestId("group-line-link-section");
    await lineLinkSection.getByRole("button", { name: "コピー" }).click();

    await expect(lineLinkSection.getByRole("button", { name: "OK!" })).toBeVisible();
    await expect(await readStubClipboard(page)).toBe("連携 E2E123");
  });

  test("group detail page can reissue a LINE link code", async ({ page }) => {
    let issuedCode = 0;

    await page.route(`**/api/groups/${E2E_GROUP_ID}/line-link`, async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      issuedCode += 1;
      const code = issuedCode === 1 ? "E2E123" : "E2E456";

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          code,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        }),
      });
    });

    await page.goto(`/groups/${E2E_GROUP_ID}`);

    await page.getByRole("button", { name: "LINE連携コードを発行" }).click();
    await expect(page.getByText("連携 E2E123")).toBeVisible();

    const reissueRequestPromise = page.waitForRequest(`**/api/groups/${E2E_GROUP_ID}/line-link`);
    await page.getByRole("button", { name: "コードを再発行" }).click();

    const reissueRequest = await reissueRequestPromise;
    expect(reissueRequest.method()).toBe("POST");
    await expect(page.getByText("連携 E2E456")).toBeVisible();
    await expect(page.getByText("連携 E2E123")).toHaveCount(0);
  });

  test("group detail page can unlink LINE integration", async ({ page }) => {
    await page.route(`**/api/groups/${E2E_LINKED_GROUP_ID}/line-link`, async (route) => {
      if (route.request().method() !== "DELETE") {
        await route.fallback();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto(`/groups/${E2E_LINKED_GROUP_ID}`);

    await expect(page.getByText("連携済み")).toBeVisible();
    const unlinkRequestPromise = page.waitForRequest(`**/api/groups/${E2E_LINKED_GROUP_ID}/line-link`);
    await page.getByRole("button", { name: "連携を解除する" }).click();

    const unlinkRequest = await unlinkRequestPromise;
    expect(unlinkRequest.method()).toBe("DELETE");
    await expect(page.getByText("LINEグループと連携すると、ヒマな人が集まった時に自動で通知が届きます。")).toBeVisible();
    await expect(page.getByRole("button", { name: "LINE連携コードを発行" })).toBeVisible();
    await expect(page.getByRole("button", { name: "連携を解除する" })).toHaveCount(0);
  });

  test("group detail page can copy invite codes", async ({ page }) => {
    await stubClipboard(page);
    await page.goto(`/groups/${E2E_GROUP_ID}`);

    const inviteCodeRow = page
      .getByText("招待コード:")
      .locator("xpath=ancestor::div[contains(@class,'flex')][1]");

    await inviteCodeRow.getByRole("button", { name: "コピー" }).click();

    await expect(inviteCodeRow.getByRole("button", { name: "コピー済" })).toBeVisible();
    await expect(await readStubClipboard(page)).toBe("ABC123");
  });

  test("group detail page can copy invite links directly", async ({ page }) => {
    await stubClipboard(page);
    await page.goto(`/groups/${E2E_GROUP_ID}`);

    const inviteLinkRow = page
      .locator('input[value="http://127.0.0.1:3100/join?code=ABC123"]')
      .locator("xpath=ancestor::div[contains(@class,'flex')][1]");

    await inviteLinkRow.getByRole("button", { name: "コピー" }).click();

    await expect(inviteLinkRow.getByRole("button", { name: "コピー済" })).toBeVisible();
    await expect(await readStubClipboard(page)).toBe("http://127.0.0.1:3100/join?code=ABC123");
  });

  test("group detail page shares invite links by copying when Web Share is unavailable", async ({
    page,
  }) => {
    await stubClipboard(page, { disableShare: true });
    await page.goto(`/groups/${E2E_GROUP_ID}`);

    await page.getByRole("button", { name: "招待リンクを共有" }).click();

    await expect(page.getByRole("button", { name: "コピー済" }).first()).toBeVisible();
    await expect(await readStubClipboard(page)).toBe("http://127.0.0.1:3100/join?code=ABC123");
  });

  test("group detail page can transfer ownership", async ({ page }) => {
    await page.route(`**/api/groups/${E2E_GROUP_ID}/transfer`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });
    await page.route(`**/api/groups/${E2E_GROUP_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          group: {
            id: E2E_GROUP_ID,
            name: "テストグループ",
            invite_code: "ABC123",
            created_by: "e2e-friend-1",
            notify_threshold: 2,
            line_group_id: null,
          },
          members: [
            {
              user_id: E2E_USER_ID,
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
        }),
      });
    });

    await page.goto(`/groups/${E2E_GROUP_ID}`);

    await page.getByRole("button", { name: "管理者にする" }).first().click();
    await expect(page.getByText("テストフレンド").first()).toBeVisible();
    const transferRequestPromise = page.waitForRequest(`**/api/groups/${E2E_GROUP_ID}/transfer`);
    await page.getByRole("button", { name: "変更する" }).click();

    const transferRequest = await transferRequestPromise;
    expect(transferRequest.postDataJSON()).toEqual({ new_owner_id: "e2e-friend-1" });
    await expect(page.getByRole("button", { name: "管理者にする" })).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByText("※ 管理者のみ変更できます")).toBeVisible();
    await expect(page.getByText("※ 管理者のみ連携設定を変更できます")).toBeVisible();
    await expect(page.getByRole("button", { name: "LINE連携コードを発行" })).toHaveCount(0);
  });

  test("group detail page can leave a group", async ({ page }) => {
    await page.route(`**/api/groups/${E2E_GROUP_ID}/leave`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, action: "left" }),
      });
    });

    await page.goto(`/groups/${E2E_GROUP_ID}`);

    const leaveRequestPromise = page.waitForRequest(`**/api/groups/${E2E_GROUP_ID}/leave`);
    await page.getByRole("button", { name: "グループを退出" }).click();
    await page.getByRole("button", { name: "退出する" }).click();

    const leaveRequest = await leaveRequestPromise;
    expect(leaveRequest.method()).toBe("POST");
    await expect(page).toHaveURL(/\/groups$/);
    await expect(page.getByRole("heading", { name: "グループ" })).toBeVisible();
    await expect(page.getByRole("button", { name: "グループを作成" }).first()).toBeVisible();
    await expect(page.getByText("テストグループ")).toBeVisible();
  });

  test("single-member group can be deleted", async ({ page }) => {
    const soloGroupId = "group-solo";

    await page.route(`**/api/groups/${soloGroupId}`, async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto(`/groups/${soloGroupId}`);

    const deleteRequestPromise = page.waitForRequest(`**/api/groups/${soloGroupId}`);
    await page.getByRole("button", { name: "グループを削除" }).click();
    await page.getByRole("button", { name: "削除する" }).click();

    const deleteRequest = await deleteRequestPromise;
    expect(deleteRequest.method()).toBe("DELETE");
    await expect(page).toHaveURL(/\/groups$/);
    await expect(page.getByRole("heading", { name: "グループ" })).toBeVisible();
    await expect(page.getByRole("button", { name: "グループを作成" }).first()).toBeVisible();
    await expect(page.getByText("ひとりグループ")).toHaveCount(0);
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
    const expectedNextMonth = format(addMonths(startOfMonth(TEST_NOW), 1), "yyyy-MM");

    await performSwipe(swipeSurface, "left");

    await expect(monthSelect).toHaveValue(expectedNextMonth);
    await expect(page).toHaveURL(new RegExp(`month=${expectedNextMonth}`));
  });

  test("calendar page does not swipe into a past month", async ({ page }) => {
    await page.goto(`/calendar?group=${E2E_GROUP_ID}`);

    const swipeSurface = page.getByTestId("calendar-swipe-surface");
    const monthSelect = page.getByTestId("calendar-month-select");
    const currentMonthValue = format(startOfMonth(TEST_NOW), "yyyy-MM");
    const initialUrl = page.url();

    await performSwipe(swipeSurface, "right");

    await expect(monthSelect).toHaveValue(currentMonthValue);
    await expect(page).toHaveURL(initialUrl);
  });

  test("calendar page only renders buttons for the current month", async ({ page }) => {
    await page.goto(`/calendar?group=${E2E_GROUP_ID}`);

    const swipeSurface = page.getByTestId("calendar-swipe-surface");
    const currentMonthDayCount = endOfMonth(startOfMonth(TEST_NOW)).getDate();

    await expect(swipeSurface.locator("button")).toHaveCount(currentMonthDayCount);
  });

  test("bulk share keeps month inputs while swiping between months", async ({ page }) => {
    await pinStoredCalendarMonth(page);
    await page.goto("/calendar/bulk");

    const monthLabel = page.getByTestId("bulk-month-label");
    const currentMonthLabel = format(startOfMonth(TEST_NOW), "yyyy年 M月");
    const nextMonthLabel = format(addMonths(startOfMonth(TEST_NOW), 1), "yyyy年 M月");
    const nextMonthFirstDate = format(
      startOfMonth(addMonths(startOfMonth(TEST_NOW), 1)),
      "yyyy-MM-dd"
    );
    const existingCommentInput = page.locator('input[value="既存のまとめてシェア"]');
    const nextMonthButton = page.getByRole("button", { name: "次の月" });
    const previousMonthButton = page.getByRole("button", { name: "前の月" });

    await expect(monthLabel).toHaveText(currentMonthLabel);
    await expect(existingCommentInput).toBeVisible();

    await nextMonthButton.click();

    await expect(monthLabel).toHaveText(nextMonthLabel);
    const nextMonthAfternoonButton = page
      .getByTestId(`bulk-day-card-${nextMonthFirstDate}`)
      .getByRole("button", { name: "午後" });
    await expect(nextMonthAfternoonButton).toBeVisible();
    await nextMonthAfternoonButton.click();
    await page.getByPlaceholder("ひとこと").fill("来月の入力");

    await previousMonthButton.click();

    await expect(monthLabel).toHaveText(currentMonthLabel);
    await expect(existingCommentInput).toBeVisible();

    await nextMonthButton.click();

    await expect(monthLabel).toHaveText(nextMonthLabel);
    await expect(page.locator('input[value="来月の入力"]')).toBeVisible();
  });

  test("bulk share page does not swipe into a finished month", async ({ page }) => {
    await pinStoredCalendarMonth(page);
    await page.goto("/calendar/bulk");

    const swipeSurface = page.getByTestId("bulk-swipe-surface");
    const monthLabel = page.getByTestId("bulk-month-label");
    const currentMonthLabel = format(startOfMonth(TEST_NOW), "yyyy年 M月");

    await expect(monthLabel).toHaveText(currentMonthLabel);
    await performSwipe(swipeSurface, "right");

    await expect(monthLabel).toHaveText(currentMonthLabel);
  });

  test("bulk share page can save selected dates and return to calendar", async ({
    page,
  }) => {
    await pinStoredCalendarMonth(page);
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
