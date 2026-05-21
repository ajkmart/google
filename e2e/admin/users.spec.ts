import { expect, test } from "@playwright/test";
import { loginAdmin } from "../helpers/mock-auth";

test.describe("Admin Users", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page);
  });

  test("users page loads with table", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");

    const heading = page
      .locator("h1, h2, [class*='text-2xl'], [class*='text-xl']")
      .filter({ hasText: /users/i })
      .first();
    await expect(heading).toBeVisible({ timeout: 15_000 });
  });

  test("search / filter input is present", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");

    const searchInput = page
      .locator("input[placeholder*='search' i], input[placeholder*='filter' i], input[type='search']")
      .first();
    await expect(searchInput).toBeVisible({ timeout: 10_000 });
  });

  test("users table has thead columns (Name, Phone, Role, Status)", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");

    await expect(
      page.locator("th, [role='columnheader']").filter({ hasText: /name|phone|role|status/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("click a user row → detail panel or modal appears", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(1500);

    const rows = page.locator("tbody tr, [role='row']:not([role='columnheader'])");
    const count = await rows.count();

    if (count > 0) {
      await rows.first().click();
      await page.waitForTimeout(800);

      const panel = page.locator(
        "[role='dialog'], [data-state='open'], [class*='sheet'], [class*='modal'], [class*='drawer']"
      ).first();
      await expect(panel).toBeVisible({ timeout: 8_000 });
    } else {
      test.skip();
    }
  });

  test("pagination controls are visible when users exist", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");

    await page.waitForTimeout(1500);

    const pagination = page
      .locator(
        "button[aria-label*='next' i], button[aria-label*='previous' i], [class*='pagination'], nav[aria-label*='pagination' i]"
      )
      .first();

    const rows = page.locator("tbody tr, [role='row']:not([role='columnheader'])");
    const rowCount = await rows.count();

    if (rowCount > 0) {
      await expect(pagination).toBeVisible({ timeout: 5_000 });
    }
  });

  test("role filter chips/tabs are visible (Customer, Rider, Vendor)", async ({ page }) => {
    await page.goto("/admin/users");
    await page.waitForLoadState("networkidle");

    const filterEl = page
      .locator("button, [role='tab'], select")
      .filter({ hasText: /customer|rider|vendor|all/i })
      .first();
    await expect(filterEl).toBeVisible({ timeout: 10_000 });
  });
});
