import { test, expect } from "@playwright/test";
import { loginAdmin } from "../helpers/auth";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "superadmin";
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ?? process.env.ADMIN_SEED_PASSWORD ?? "Admin@123";

test.describe("Admin Categories", () => {
  test.beforeEach(async ({ page }) => {
    await loginAdmin(page, { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
    await page.waitForSelector('input[aria-label="Filter sidebar items"]', {
      timeout: 20_000,
    });
    const categoriesLink = page.locator('a[href="/admin/categories"]').first();
    await expect(categoriesLink).toBeAttached({ timeout: 10_000 });
    await categoriesLink.evaluate((el: HTMLElement) => el.click());
    await expect(page).toHaveURL(/\/admin\/categories/, { timeout: 10_000 });
  });

  test("/admin/categories → category tree renders", async ({ page }) => {
    const treeOrEmpty = page
      .locator("[class*='space-y'], [class*='tree'], [class*='card'], table, [class*='rounded-2xl']")
      .first();
    await expect(treeOrEmpty).toBeVisible({ timeout: 15_000 });
  });

  test("click 'Add Category' → dialog opens", async ({ page }) => {
    const addBtn = page.locator("button").filter({ hasText: /Add Category/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await expect(
      dialog.locator("input, [name='name'], [placeholder*='name' i]").first(),
    ).toBeVisible();
  });

  test("fill name + select type → Save → new category appears in tree", async ({ page }) => {
    const uniqueName = `E2E-Cat-${Date.now()}`;

    const addBtn = page.locator("button").filter({ hasText: /Add Category/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const nameInput = dialog
      .locator("input[name='name'], input[placeholder*='name' i], input")
      .first();
    await nameInput.fill(uniqueName);

    const typeSelect = dialog
      .locator("select, [role='combobox']")
      .filter({ hasText: /mart|food|pharmacy|All Types/i })
      .first();
    if ((await typeSelect.count()) > 0) {
      await typeSelect
        .selectOption({ label: "Mart" })
        .catch(() => typeSelect.selectOption({ value: "mart" }));
    }

    const saveBtn = dialog.locator("button").filter({ hasText: /save|create|add/i }).first();
    await saveBtn.click();

    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await expect(page.locator(`text=${uniqueName}`).first()).toBeVisible({ timeout: 15_000 });
  });

  test("delete category → confirmation dialog → item removed", async ({ page }) => {
    const uniqueName = `E2E-Del-${Date.now()}`;

    const addBtn = page.locator("button").filter({ hasText: /Add Category/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();

    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    const nameInput = dialog.locator("input").first();
    await nameInput.fill(uniqueName);

    const saveBtn = dialog.locator("button").filter({ hasText: /save|create|add/i }).first();
    await saveBtn.click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    await expect(page.locator(`text=${uniqueName}`).first()).toBeVisible({ timeout: 15_000 });

    const row = page
      .locator("[class*='rounded'], [class*='row'], tr")
      .filter({ hasText: uniqueName })
      .first();
    const deleteBtn = row.locator("button").filter({ hasText: /delete|trash|remove/i }).first();
    await deleteBtn.click();

    const confirmDialog = page.locator('[role="dialog"], [role="alertdialog"]').last();
    await expect(confirmDialog).toBeVisible({ timeout: 5_000 });

    const confirmBtn = confirmDialog
      .locator("button")
      .filter({ hasText: /delete|confirm|yes/i })
      .first();
    await confirmBtn.click();

    await expect(page.locator(`text=${uniqueName}`)).toBeHidden({ timeout: 10_000 });
  });
});
