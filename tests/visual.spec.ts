import { expect, test, type Locator, type Page } from "@playwright/test";
import { E2E_GROUP_ID, signIn } from "./helpers/e2e";

async function expectVisualSnapshot(target: Locator, snapshotName: string) {
  // Linux CI and local macOS Chromium rasterize Japanese text slightly differently.
  await expect(target).toHaveScreenshot(snapshotName, { scale: "css" });
}

async function gotoStablePage(page: Page, path: string) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(path, { waitUntil: "networkidle" });

    const notFoundHeading = page.getByRole("heading", { name: "404" });
    if (!(await notFoundHeading.isVisible().catch(() => false))) {
      return;
    }
  }

  await expect(page.getByRole("heading", { name: "404" })).toHaveCount(0);
}

async function hideWithVisualStyle(page: Page, cssText: string) {
  await page.addStyleTag({ content: cssText });
}

test.describe("visual regression", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test("calendar page layout stays stable", async ({ page }) => {
    await gotoStablePage(page, `/calendar?group=${E2E_GROUP_ID}`);

    await expect(page.getByTestId("calendar-swipe-surface")).toBeVisible();
    await expectVisualSnapshot(page.getByTestId("calendar-grid-visual"), "calendar-page.png");
  });

  test("bulk share page layout stays stable", async ({ page }) => {
    await gotoStablePage(page, "/calendar/bulk");

    await expect(page.getByTestId("bulk-swipe-surface")).toBeVisible();
    await hideWithVisualStyle(
      page,
      [
        '[data-testid="bulk-visual"] [data-testid^="bulk-day-card-"]:nth-child(n+7) {',
        "  display: none !important;",
        "}",
      ].join("\n")
    );
    await expectVisualSnapshot(page.getByTestId("bulk-visual"), "bulk-page.png");
  });

  test("profile page cards stay stable", async ({ page }) => {
    await gotoStablePage(page, "/profile");

    await expect(page.getByText("シェアヒマとは？")).toBeVisible();
    await expectVisualSnapshot(page.getByTestId("profile-page-content"), "profile-page.png");
  });

  test("groups page layout stays stable", async ({ page }) => {
    await gotoStablePage(page, "/groups");

    await expect(page.getByText("テストグループ")).toBeVisible();
    await expectVisualSnapshot(page.getByTestId("groups-page-content"), "groups-page.png");
  });

  test("group detail page layout stays stable", async ({ page }) => {
    await gotoStablePage(page, `/groups/${E2E_GROUP_ID}`);

    await expect(page.getByText("友達を招待")).toBeVisible();
    await expectVisualSnapshot(page.getByTestId("group-detail-visual"), "group-detail-page.png");
  });

  test("day detail page layout stays stable", async ({ page }) => {
    await gotoStablePage(page, `/calendar/2099-12-31?group=${E2E_GROUP_ID}`);

    await expect(page.getByText("この日の予定")).toBeVisible();
    await expectVisualSnapshot(page.getByTestId("day-detail-visual"), "day-detail-page.png");
  });
});

test.describe("public visual regression", () => {
  test.describe.configure({ mode: "serial" });

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

    await gotoStablePage(page, "/join?code=ABC123");

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

    await gotoStablePage(page, "/join?code=BAD123");

    await expect(page.getByRole("heading", { name: "参加できませんでした" })).toBeVisible();
    await expectVisualSnapshot(page.getByTestId("join-error-card"), "join-error-page.png");
  });
});
