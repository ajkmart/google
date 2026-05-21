import { defineConfig, devices } from "@playwright/test";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "superadmin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? process.env.ADMIN_SEED_PASSWORD ?? "Admin@123";

export { ADMIN_USERNAME, ADMIN_PASSWORD };

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/artifacts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [["list"], ["html", { outputFolder: "e2e/reports", open: "never" }]],

  use: {
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "admin",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3000",
      },
      testMatch: "e2e/admin/**/*.spec.ts",
    },
    {
      name: "vendor",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3001",
      },
      testMatch: "e2e/vendor/**/*.spec.ts",
    },
    {
      name: "rider",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:3002",
      },
      testMatch: "e2e/rider/**/*.spec.ts",
    },
  ],

  webServer: [
    {
      command: "PORT=3000 BASE_PATH=/admin pnpm --filter @workspace/admin dev",
      port: 3000,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "PORT=3001 BASE_PATH=/vendor pnpm --filter @workspace/vendor-app dev",
      port: 3001,
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "PORT=3002 BASE_PATH=/rider pnpm --filter @workspace/rider-app dev",
      port: 3002,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
