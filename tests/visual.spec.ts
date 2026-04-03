import { expect, test } from "@playwright/test";
import { E2E_GROUP_ID, signIn } from "./helpers/e2e";

test.describe("visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("calendar page layout stays stable", async ({ page }) => {
    await page.goto(`/calendar?group=${E2E_GROUP_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByTestId("calendar-swipe-surface")).toBeVisible();
    await expect(page).toHaveScreenshot("calendar-page.png");
  });

  test("bulk share page layout stays stable", async ({ page }) => {
    await page.goto("/calendar/bulk", { waitUntil: "networkidle" });

    await expect(page.getByTestId("bulk-swipe-surface")).toBeVisible();
    await expect(page).toHaveScreenshot("bulk-page.png");
  });

  test("profile page cards stay stable", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "networkidle" });

    await expect(page.getByText("シェアヒマとは？")).toBeVisible();
    await expect(page).toHaveScreenshot("profile-page.png");
  });

  test("groups page layout stays stable", async ({ page }) => {
    await page.goto("/groups", { waitUntil: "networkidle" });

    await expect(page.getByText("テストグループ")).toBeVisible();
    await expect(page).toHaveScreenshot("groups-page.png");
  });
});

test.describe("public visual regression", () => {
  test("join success page layout stays stable", async ({ page }) => {
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

    await page.goto("/join?code=ABC123", { waitUntil: "networkidle" });

    await expect(
      page.getByRole("heading", { name: "「テストグループ」に参加しました！" })
    ).toBeVisible();
    await expect(page).toHaveScreenshot("join-success-page.png");
  });
});
