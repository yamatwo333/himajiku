import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E_GROUP_ID, signIn } from "./helpers/e2e";

async function expectVisualSnapshot(target: Locator, snapshotName: string) {
  // Linux CI and local macOS Chromium rasterize Japanese text slightly differently.
  await expect(target).toHaveScreenshot(snapshotName, { scale: "css" });
}

async function hideWithVisualStyle(page: Page, cssText: string) {
  await page.addStyleTag({ content: cssText });
}

test.describe("visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("calendar page layout stays stable", async ({ page }) => {
    await page.goto(`/calendar?group=${E2E_GROUP_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByTestId("calendar-swipe-surface")).toBeVisible();
    await expectVisualSnapshot(page.getByTestId("calendar-swipe-surface"), "calendar-page.png");
  });

  test("bulk share page layout stays stable", async ({ page }) => {
    await page.goto("/calendar/bulk", { waitUntil: "networkidle" });

    await expect(page.getByTestId("bulk-swipe-surface")).toBeVisible();
    await hideWithVisualStyle(
      page,
      [
        '[data-testid="bulk-swipe-surface"] [data-testid^="bulk-day-card-"]:nth-child(n+7) {',
        "  display: none !important;",
        "}",
      ].join("\n")
    );
    await expectVisualSnapshot(page.getByTestId("bulk-page-content"), "bulk-page.png");
  });

  test("profile page cards stay stable", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "networkidle" });

    await expect(page.getByText("シェアヒマとは？")).toBeVisible();
    await expectVisualSnapshot(page.getByTestId("profile-page-content"), "profile-page.png");
  });

  test("groups page layout stays stable", async ({ page }) => {
    await page.goto("/groups", { waitUntil: "networkidle" });

    await expect(page.getByText("テストグループ")).toBeVisible();
    await expectVisualSnapshot(page.getByTestId("groups-page-content"), "groups-page.png");
  });

  test("group detail page layout stays stable", async ({ page }) => {
    await page.goto(`/groups/${E2E_GROUP_ID}`, { waitUntil: "networkidle" });

    await expect(page.getByText("友達を招待")).toBeVisible();
    await hideWithVisualStyle(
      page,
      [
        '[data-testid="group-detail-content"] > :nth-child(n+5) {',
        "  display: none !important;",
        "}",
      ].join("\n")
    );
    await expectVisualSnapshot(page.getByTestId("group-detail-content"), "group-detail-page.png");
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
    await expectVisualSnapshot(page.getByTestId("join-success-card"), "join-success-page.png");
  });

  test("join error page layout stays stable", async ({ page }) => {
    await page.route("**/api/groups/join", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: "招待コードが見つかりません",
        }),
      });
    });

    await page.goto("/join?code=BAD123", { waitUntil: "networkidle" });

    await expect(page.getByRole("heading", { name: "参加できませんでした" })).toBeVisible();
    await expectVisualSnapshot(page.getByTestId("join-error-card"), "join-error-page.png");
  });
});
