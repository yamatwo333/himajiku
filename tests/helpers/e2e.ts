import type { Locator, Page } from "@playwright/test";

export const BASE_URL = "http://127.0.0.1:3100";
export const AUTH_COOKIE_NAME = "sharehima-e2e-user-id";
export const E2E_USER_ID = "e2e-user-1";
export const E2E_GROUP_ID = "e2e-group-1";
export const TEST_NOW = new Date(
  process.env.E2E_NOW_ISO || "2026-04-03T12:00:00+09:00"
);

export async function signIn(page: Page) {
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

export function getBulkCardByComment(page: Page, comment: string): Locator {
  return page
    .locator(`input[value="${comment}"]`)
    .locator("xpath=ancestor::div[contains(@class,'rounded-xl')][1]");
}

export async function performSwipe(
  surface: Locator,
  direction: "left" | "right"
) {
  const bounds = await surface.boundingBox();

  if (!bounds) {
    throw new Error("swipe surface not found");
  }

  const centerY = bounds.y + bounds.height / 2;
  const startX =
    direction === "left" ? bounds.x + bounds.width * 0.8 : bounds.x + bounds.width * 0.2;
  const endX =
    direction === "left" ? bounds.x + bounds.width * 0.2 : bounds.x + bounds.width * 0.8;

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
