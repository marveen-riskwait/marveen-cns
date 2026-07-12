import { expect } from "@playwright/test";

export const ADMIN = { email: "admin@marveen.cms", password: "ChangeMe123!" };

// Log in through the real UI and land on the dashboard.
export async function login(page, creds = ADMIN) {
  await page.goto("/login");
  await page.fill("input[type=email]", creds.email);
  await page.fill("input[type=password]", creds.password);
  await page.click('button:has-text("Se connecter")');
  await page.waitForURL("**/admin");
  await expect(page.locator("h1, .mv-logo")).toBeVisible();
}
