import { test, expect } from "@playwright/test";
import { loginAdmin } from "../helpers/auth";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "superadmin";
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ?? process.env.ADMIN_SEED_PASSWORD ?? "Admin@123";

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page, { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
    await page.goto("/admin");
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
  });

  test("stats cards render (Revenue, Rides, Orders, SOS)", async ({ page }) => {
    const statsRegex = /Revenue|Rides|Orders|SOS|Users|Vendors|Riders/i;
    const statsCards = page.locator(".rounded-2xl, [class*='card'], [class*='stat']").filter({ hasText: statsRegex });
    await expect(statsCards.first()).toBeVisible({ timeout: 15_000 });

    const count = await statsCards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test("navigation to /admin/users → users table loads", async ({ page }) => {
    const usersLink = page.locator("a[href*='/users'], button, li").filter({ hasText: /^Users$/i }).first();
    await expect(usersLink).toBeVisible({ timeout: 10_000 });
    await usersLink.click();

    await expect(page).toHaveURL(/\/admin\/users/, { timeout: 10_000 });

    const tableOrCard = page.locator("table, [role='table'], [class*='DataTable'], [data-testid*='user']").first();
    await expect(tableOrCard).toBeVisible({ timeout: 15_000 });
  });

  test("navigation to /admin/orders → orders table loads", async ({ page }) => {
    const ordersLink = page.locator("a[href*='/orders'], button, li").filter({ hasText: /^Orders$/i }).first();
    await expect(ordersLink).toBeVisible({ timeout: 10_000 });
    await ordersLink.click();

    await expect(page).toHaveURL(/\/admin\/orders/, { timeout: 10_000 });

    const tableOrContent = page.locator("table, [role='table'], [class*='card'], [data-testid*='order']").first();
    await expect(tableOrContent).toBeVisible({ timeout: 15_000 });
  });

  test("pull-to-refresh: touch drag triggers spinner then content refreshes", async ({ page }) => {
    await page.waitForLoadState("networkidle");

    await page.mouse.move(640, 200);
    await page.mouse.down();
    await page.mouse.move(640, 400, { steps: 10 });

    const spinner = page.locator('[class*="animate-spin"], svg[class*="spin"], [data-testid="ptr-spinner"]');
    await expect(spinner.first()).toBeVisible({ timeout: 5_000 });

    await page.mouse.up();
    await page.waitForTimeout(2_000);

    const mainContent = page.locator("main, [class*='space-y'], [class*='dashboard']").first();
    await expect(mainContent).toBeVisible({ timeout: 10_000 });
  });
});
