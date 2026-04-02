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
});
