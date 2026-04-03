import { expect, test } from "@playwright/test";

test.describe("public smoke flows", () => {
  test("signed-out visitors are redirected from home to login", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveURL(/\/login$/);
    await expect(
      page.getByRole("link", { name: "LINEでログイン" })
    ).toBeVisible();
  });

  test("login page shows an error panel when the query contains an auth error", async ({
    page,
  }) => {
    await page.goto("/login?error=token_failed");

    const alert = page
      .locator('[role="alert"]')
      .filter({ hasText: "ログインできませんでした" });
    await expect(alert).toContainText("ログインできませんでした");
    await expect(alert).toContainText("LINEとの連携に失敗しました。");
  });

  test("protected pages redirect signed-out visitors to login", async ({
    page,
  }) => {
    await page.goto("/groups");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fgroups$/);

    await page.goto("/profile");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile$/);
  });

  test("join page shows an error when the invite code is missing", async ({
    page,
  }) => {
    await page.goto("/join");

    const alert = page
      .locator('[role="alert"]')
      .filter({ hasText: "参加できませんでした" });
    await expect(alert).toContainText("参加できませんでした");
    await expect(alert).toContainText("招待コードが指定されていません");
  });

  test("join page shows a success state when the invite is accepted", async ({
    page,
  }) => {
    await page.route("**/api/groups/join", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          group: {
            id: "group-1",
            name: "テストグループ",
          },
        }),
      });
    });

    await page.goto("/join?code=ABC123");

    await expect(
      page.getByRole("heading", { name: "「テストグループ」に参加しました！" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "カレンダーを見る" })
    ).toBeVisible();
  });

  test("join page shows an already-joined state when the invite is duplicated", async ({
    page,
  }) => {
    await page.route("**/api/groups/join", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: "すでにこのグループに参加しています",
          group: {
            id: "group-1",
            name: "テストグループ",
          },
        }),
      });
    });

    await page.goto("/join?code=ABC123");

    await expect(
      page.getByRole("heading", { name: "「テストグループ」に参加済みです" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "カレンダーを見る" })
    ).toBeVisible();
  });

  test("join page asks guests for a display name before first join", async ({
    page,
  }) => {
    let requestCount = 0;

    await page.route("**/api/groups/join", async (route) => {
      requestCount += 1;
      const body = route.request().postDataJSON();

      if (requestCount === 1) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "表示名を入力してください",
            code: "DISPLAY_NAME_REQUIRED",
            group: {
              id: "group-1",
              name: "テストグループ",
            },
          }),
        });
        return;
      }

      expect(body).toEqual({
        invite_code: "ABC123",
        display_name: "たけし",
      });

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          group: {
            id: "group-1",
            name: "テストグループ",
          },
        }),
      });
    });

    await page.goto("/join?code=ABC123");

    await expect(page.getByTestId("join-guest-name-card")).toBeVisible();
    await page.getByPlaceholder("表示名（例: たけし）").fill("たけし");
    await page.getByRole("button", { name: "この名前で参加する" }).click();

    await expect(
      page.getByRole("heading", { name: "「テストグループ」に参加しました！" })
    ).toBeVisible();
  });

  test("join page prompts guests to log in before joining a second group", async ({
    page,
  }) => {
    await page.route("**/api/groups/join", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error:
            "未ログインでは1グループまでお試しできます。LINEでログインすると、複数グループ参加、自分向け通知、予定の引き継ぎが使えます。",
          code: "LOGIN_REQUIRED_FOR_MULTIPLE_GROUPS",
          group: {
            id: "group-2",
            name: "別のテストグループ",
          },
          current_group: {
            id: "group-1",
            name: "今のグループ",
          },
        }),
      });
    });

    await page.goto("/join?code=XYZ789");

    await expect(page.getByTestId("join-login-required-card")).toBeVisible();
    await expect(page.getByRole("heading", { name: "複数グループを使うにはLINEログイン" })).toBeVisible();
    await expect(page.getByRole("button", { name: "LINEでログインする" })).toBeVisible();
    await expect(page.getByRole("button", { name: "今のグループに戻る" })).toBeVisible();
  });
});
