# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin/login.spec.ts >> Admin Login >> dashboard has sidebar navigation visible after login
- Location: e2e/admin/login.spec.ts:34:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('nav, aside, [role=\'navigation\']').first()
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('nav, aside, [role=\'navigation\']').first()

```

```yaml
- heading "AJKMart Admin" [level=1]
- paragraph: Sign in to continue
- alert: Invalid username or password
- text: Username or Email
- textbox "admin@example.com": superadmin
- text: Password
- textbox "Enter your password": SuperAdmin@2024!
- button "Show password"
- checkbox "Remember me"
- text: Remember me 8-hour session
- button "Forgot Password?"
- button "Sign In"
- text: Contact support if you cannot access your account.
- region "Notifications (F8)":
  - list
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { loginAdmin } from "../helpers/auth";
  3  | 
  4  | const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "superadmin";
  5  | const ADMIN_PASSWORD =
  6  |   process.env.ADMIN_PASSWORD ?? process.env.ADMIN_SEED_PASSWORD ?? "Admin@123";
  7  | 
  8  | test.describe("Admin Login", () => {
  9  |   test("load /admin/login → login screen renders", async ({ page }) => {
  10 |     await page.goto("/admin/login");
  11 | 
  12 |     await expect(page.locator('input[placeholder="admin@example.com"]')).toBeVisible({ timeout: 15_000 });
  13 |     await expect(page.locator('input[placeholder="Enter your password"]')).toBeVisible();
  14 |     await expect(page.locator('button:has-text("Sign In")')).toBeVisible();
  15 |     await expect(page.locator("text=AJKMart Admin")).toBeVisible();
  16 |   });
  17 | 
  18 |   test("submit correct credentials → dashboard loads", async ({ page }) => {
  19 |     await loginAdmin(page, { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
  20 | 
  21 |     await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });
  22 |     await expect(page.locator("[data-testid='admin-sidebar'], nav, aside").first()).toBeVisible({ timeout: 10_000 });
  23 |   });
  24 | 
  25 |   test("click 'Forgot Password?' → forgot screen appears", async ({ page }) => {
  26 |     await page.goto("/admin/login");
  27 |     await page.waitForSelector("text=Forgot Password?", { timeout: 15_000 });
  28 | 
  29 |     await page.click("text=Forgot Password?");
  30 | 
  31 |     await expect(page).toHaveURL(/forgot/, { timeout: 10_000 });
  32 |   });
  33 | 
  34 |   test("dashboard has sidebar navigation visible after login", async ({ page }) => {
  35 |     await loginAdmin(page, { username: ADMIN_USERNAME, password: ADMIN_PASSWORD });
  36 | 
  37 |     const sidebar = page.locator("nav, aside, [role='navigation']").first();
> 38 |     await expect(sidebar).toBeVisible({ timeout: 10_000 });
     |                           ^ Error: expect(locator).toBeVisible() failed
  39 | 
  40 |     await expect(
  41 |       page.locator("a, button, li").filter({ hasText: /Dashboard|Users|Orders|Riders|Vendors/i }).first(),
  42 |     ).toBeVisible({ timeout: 10_000 });
  43 |   });
  44 | 
  45 |   test("submit wrong password → error message appears (mocked)", async ({ page }) => {
  46 |     await page.route("**/api/admin/auth/login", async (route) => {
  47 |       await route.fulfill({
  48 |         status: 401,
  49 |         contentType: "application/json",
  50 |         body: JSON.stringify({ error: "Invalid credentials" }),
  51 |       });
  52 |     });
  53 | 
  54 |     await page.goto("/admin/login");
  55 |     await page.waitForSelector('input[placeholder="admin@example.com"]', { timeout: 15_000 });
  56 | 
  57 |     await page.fill('input[placeholder="admin@example.com"]', ADMIN_USERNAME);
  58 |     await page.fill('input[placeholder="Enter your password"]', "wrong-password-xyz");
  59 |     await page.click('button:has-text("Sign In")');
  60 | 
  61 |     const errorLocator = page.locator('[role="alert"], [data-testid="login-error"]');
  62 |     await expect(errorLocator.first()).toBeVisible({ timeout: 10_000 });
  63 |   });
  64 | });
  65 | 
```