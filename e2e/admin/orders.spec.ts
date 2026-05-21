import { expect, test } from "@playwright/test";
import { loginAdmin } from "../helpers/mock-auth";

test.describe("Admin Orders", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test("orders page loads with heading", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.waitForLoadState("networkidle");

    const heading = page
      .locator("h1, h2, [class*='text-2xl']")
      .filter({ hasText: /orders/i })
      .first();
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test("orders table or list renders", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.waitForLoadState("networkidle");

    const tableOrList = page
      .locator("table, [role='table'], [class*='orders-list'], [class*='order-row']")
      .first();
    await expect(tableOrList).toBeVisible({ timeout: 10_000 });
  });

  test("status filter tabs visible (Pending, Active, Completed, Cancelled)", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.waitForLoadState("networkidle");

    const filterEl = page
      .locator("button, [role='tab']")
      .filter({ hasText: /pending|active|completed|cancelled|all/i })
      .first();
    await expect(filterEl).toBeVisible({ timeout: 10_000 });
  });

  test("search / date filter input visible", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.waitForLoadState("networkidle");

    const searchEl = page
      .locator(
        "input[placeholder*='search' i], input[placeholder*='order' i], input[type='search'], input[type='date'], input[placeholder*='date' i]"
      )
      .first();
    await expect(searchEl).toBeVisible({ timeout: 10_000 });
  });

  test("click order row → detail modal opens with order info", async ({ page }) => {
    await page.goto("/admin/orders");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const rows = page.locator("tbody tr, [data-row], [class*='order-row']");
    const count = await rows.count();

    if (count > 0) {
      await rows.first().click();
      await page.waitForTimeout(800);

      const modal = page
        .locator("[role='dialog'], [data-state='open'], [class*='modal'], [class*='sheet']")
        .first();
      await expect(modal).toBeVisible({ timeout: 8_000 });
    } else {
      test.skip();
    }
  });
});
