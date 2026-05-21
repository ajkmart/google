# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin/categories.spec.ts >> Admin Categories >> /admin/categories → category tree renders
- Location: e2e/admin/categories.spec.ts:20:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[class*=\'space-y\'], [class*=\'tree\'], [class*=\'card\'], table, [class*=\'rounded-2xl\']').first()
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('[class*=\'space-y\'], [class*=\'tree\'], [class*=\'card\'], table, [class*=\'rounded-2xl\']').first()

```

```yaml
- region "Notifications (F8)":
  - list
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import { loginAdmin } from "../helpers/auth";
  3   | 
  4   | const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "superadmin";
  5   | const ADMIN_PASSWORD =
  6   |   process.env.ADMIN_PASSWORD ?? process.env.ADMIN_SEED_PASSWORD ?? "Admin@123";
  7   | 
  8   | test.describe("Admin Categories", () => {
  9   |   test.beforeEach(async ({ page }) => {
  10  |     await loginAdmin(page, { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
  11  |     await page.waitForSelector('input[aria-label="Filter sidebar items"]', {
  12  |       timeout: 20_000,
  13  |     });
  14  |     const categoriesLink = page.locator('a[href="/admin/categories"]').first();
  15  |     await expect(categoriesLink).toBeAttached({ timeout: 10_000 });
  16  |     await categoriesLink.evaluate((el: HTMLElement) => el.click());
  17  |     await expect(page).toHaveURL(/\/admin\/categories/, { timeout: 10_000 });
  18  |   });
  19  | 
  20  |   test("/admin/categories → category tree renders", async ({ page }) => {
  21  |     const treeOrEmpty = page
  22  |       .locator("[class*='space-y'], [class*='tree'], [class*='card'], table, [class*='rounded-2xl']")
  23  |       .first();
> 24  |     await expect(treeOrEmpty).toBeVisible({ timeout: 15_000 });
      |                               ^ Error: expect(locator).toBeVisible() failed
  25  |   });
  26  | 
  27  |   test("click 'Add Category' → dialog opens", async ({ page }) => {
  28  |     const addBtn = page.locator("button").filter({ hasText: /Add Category/i }).first();
  29  |     await expect(addBtn).toBeVisible({ timeout: 10_000 });
  30  |     await addBtn.click();
  31  | 
  32  |     const dialog = page.locator('[role="dialog"]');
  33  |     await expect(dialog).toBeVisible({ timeout: 5_000 });
  34  | 
  35  |     await expect(
  36  |       dialog.locator("input, [name='name'], [placeholder*='name' i]").first(),
  37  |     ).toBeVisible();
  38  |   });
  39  | 
  40  |   test("fill name + select type → Save → new category appears in tree", async ({ page }) => {
  41  |     const uniqueName = `E2E-Cat-${Date.now()}`;
  42  | 
  43  |     const addBtn = page.locator("button").filter({ hasText: /Add Category/i }).first();
  44  |     await expect(addBtn).toBeVisible({ timeout: 10_000 });
  45  |     await addBtn.click();
  46  | 
  47  |     const dialog = page.locator('[role="dialog"]');
  48  |     await expect(dialog).toBeVisible({ timeout: 5_000 });
  49  | 
  50  |     const nameInput = dialog
  51  |       .locator("input[name='name'], input[placeholder*='name' i], input")
  52  |       .first();
  53  |     await nameInput.fill(uniqueName);
  54  | 
  55  |     const typeSelect = dialog
  56  |       .locator("select, [role='combobox']")
  57  |       .filter({ hasText: /mart|food|pharmacy|All Types/i })
  58  |       .first();
  59  |     if ((await typeSelect.count()) > 0) {
  60  |       await typeSelect
  61  |         .selectOption({ label: "Mart" })
  62  |         .catch(() => typeSelect.selectOption({ value: "mart" }));
  63  |     }
  64  | 
  65  |     const saveBtn = dialog.locator("button").filter({ hasText: /save|create|add/i }).first();
  66  |     await saveBtn.click();
  67  | 
  68  |     await expect(dialog).toBeHidden({ timeout: 10_000 });
  69  |     await expect(page.locator(`text=${uniqueName}`).first()).toBeVisible({ timeout: 15_000 });
  70  |   });
  71  | 
  72  |   test("delete category → confirmation dialog → item removed", async ({ page }) => {
  73  |     const uniqueName = `E2E-Del-${Date.now()}`;
  74  | 
  75  |     const addBtn = page.locator("button").filter({ hasText: /Add Category/i }).first();
  76  |     await expect(addBtn).toBeVisible({ timeout: 10_000 });
  77  |     await addBtn.click();
  78  | 
  79  |     const dialog = page.locator('[role="dialog"]');
  80  |     await expect(dialog).toBeVisible({ timeout: 5_000 });
  81  | 
  82  |     const nameInput = dialog.locator("input").first();
  83  |     await nameInput.fill(uniqueName);
  84  | 
  85  |     const saveBtn = dialog.locator("button").filter({ hasText: /save|create|add/i }).first();
  86  |     await saveBtn.click();
  87  |     await expect(dialog).toBeHidden({ timeout: 10_000 });
  88  |     await expect(page.locator(`text=${uniqueName}`).first()).toBeVisible({ timeout: 15_000 });
  89  | 
  90  |     const row = page
  91  |       .locator("[class*='rounded'], [class*='row'], tr")
  92  |       .filter({ hasText: uniqueName })
  93  |       .first();
  94  |     const deleteBtn = row.locator("button").filter({ hasText: /delete|trash|remove/i }).first();
  95  |     await deleteBtn.click();
  96  | 
  97  |     const confirmDialog = page.locator('[role="dialog"], [role="alertdialog"]').last();
  98  |     await expect(confirmDialog).toBeVisible({ timeout: 5_000 });
  99  | 
  100 |     const confirmBtn = confirmDialog
  101 |       .locator("button")
  102 |       .filter({ hasText: /delete|confirm|yes/i })
  103 |       .first();
  104 |     await confirmBtn.click();
  105 | 
  106 |     await expect(page.locator(`text=${uniqueName}`)).toBeHidden({ timeout: 10_000 });
  107 |   });
  108 | });
  109 | 
```