import { defineConfig, devices } from "@playwright/test";

const E2E_NOW_ISO = "2026-04-03T12:00:00+09:00";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : "list",
  snapshotPathTemplate:
    "{testDir}/__screenshots__{/projectName}/{testFilePath}/{arg}{ext}",
  expect: {
    toHaveScreenshot: {
      pathTemplate:
        "{testDir}/__screenshots__{/projectName}/{testFilePath}/{arg}{ext}",
      animations: "disabled",
      caret: "hide",
      scale: "css",
      maxDiffPixelRatio: 0.03,
    },
  },
  use: {
    baseURL: "http://127.0.0.1:3100",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        browserName: "chromium",
        ...devices["iPhone 13"],
      },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
    env: {
      ...process.env,
      E2E_AUTH_BYPASS: "1",
      E2E_NOW_ISO,
      NEXT_PUBLIC_E2E_NOW_ISO: E2E_NOW_ISO,
      TZ: "Asia/Tokyo",
    },
    url: "http://127.0.0.1:3100/login",
    reuseExistingServer: false,
    timeout: 120 * 1000,
  },
});
