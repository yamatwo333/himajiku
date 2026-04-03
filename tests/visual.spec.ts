import { expect, test, type Page } from "@playwright/test";

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
});
