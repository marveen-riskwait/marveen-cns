import { expect, test } from "@playwright/test";

import { login } from "./helpers.js";

test.describe("Admin smoke", () => {
  test("login lands on the dashboard", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("generic CRUD: create and delete a FAQ entry", async ({ page }) => {
    await login(page);
    await page.goto("/admin/faq");
    await expect(page.locator("h1")).toHaveText("FAQ");

    const question = `E2E FAQ ${Date.now()}`;
    await page.click('button:has-text("Nouveau")');
    await page.waitForSelector(".modal.d-block");
    await page.locator(".modal input[type=text]").nth(0).fill(question);
    await page.locator(".modal textarea").first().fill("Réponse E2E.");
    await page.click('.modal button:has-text("Enregistrer")');

    const row = page.locator("tbody tr", { hasText: question });
    await expect(row).toBeVisible();

    // Clean up via the API so the suite is idempotent.
    await page.evaluate(async (q) => {
      const csrf = localStorage.getItem("csrf_token");
      const list = await (await fetch("/api/faq?per_page=100", { credentials: "include" })).json();
      const item = list.items.find((i) => i.question === q);
      if (item) {
        await fetch(`/api/faq/${item.id}`, {
          method: "DELETE", credentials: "include", headers: { "X-CSRF-TOKEN": csrf },
        });
      }
    }, question);
  });

  test("settings persist and expose public values", async ({ page }) => {
    await login(page);
    await page.goto("/admin/settings");
    await expect(page.locator("h1")).toHaveText("Paramètres");

    const name = `E2E Site ${Date.now()}`;
    await page.locator(".card input[type=text]").nth(0).fill(name);
    await page.click('button:has-text("Enregistrer")');

    await page.waitForTimeout(800);
    const publicName = await page.evaluate(async () => {
      const r = await fetch("/api/public/settings");
      return (await r.json()).data.site_name;
    });
    expect(publicName).toBe(name);
  });
});
