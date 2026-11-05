import { expect, test } from "@playwright/test";
import { captureScreenshot, completeOnboarding, openBotPanelTab, rpc, signup } from "./helpers";

test("sidebar rail keeps chats interactive at a fixed width", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.setViewportSize({ width: 1400, height: 900 });
  await signup(page, `sidebar-rail-${Date.now()}@rakazo.test`, "password12", "Sidebar Sample");
  await completeOnboarding(page);
  const bot = await rpc<{ id: string }>(page, "bots/create", {
    name: "Research",
    description: "",
    instructions: "",
    notifyOnFinish: true,
    computerMode: "team",
  });
  await rpc(page, "threads/markUnread", { botId: bot.id });
  await page.reload();
  const sidebar = page.getByTestId("bots-sidebar");
  const row = page.locator(`[data-roster-bot-id="${bot.id}"]`);
  await expect(page.getByTestId("bots-sidebar-edge")).toHaveCount(0);
  await expect(sidebar).toHaveCSS("width", "240px");
  await captureScreenshot(page, testInfo, "sidebar-fixed-expanded");

  await sidebar.getByTestId("sidebar-search-trigger").click();
  await sidebar.getByRole("textbox", { name: "Search", exact: true }).fill("no roster matches");
  await expect(row).toHaveCount(0);
  await page.getByTestId("minimize-bots-sidebar").click();
  await expect(sidebar).toHaveCSS("width", "72px");
  await expect(row).toHaveAccessibleName("Research");
  await expect(row).toHaveAccessibleDescription(/unread/);
  await page.getByTestId("restore-bots-sidebar").click();
  await expect(sidebar.getByRole("textbox", { name: "Search", exact: true })).toHaveValue(
    "no roster matches",
  );
  await sidebar.getByRole("textbox", { name: "Search", exact: true }).fill("");
  await page.getByTestId("minimize-bots-sidebar").click();
  await expect(sidebar).toHaveCSS("width", "72px");
  await row.click();
  await expect(page).toHaveURL(new RegExp(`/app/${bot.id}$`));
  await expect(row).toHaveAttribute("aria-current", "page");
  await expect(sidebar.locator("[data-roster-preview]")).toHaveCount(0);
  await page.mouse.move(700, 450);
  await row.hover();
  const tooltip = page.locator('[data-slot="tooltip-content"]').filter({ hasText: "Research" });
  await expect(tooltip).toBeVisible();
  await expect
    .poll(async () => {
      const label = await tooltip.boundingBox();
      const icon = await row.boundingBox();
      return label && icon ? label.x >= icon.x + icon.width : false;
    })
    .toBe(true);
  await captureScreenshot(page, testInfo, "sidebar-mini-avatar-rail");
  await page.getByTestId("user-menu-trigger").click();
  await page.getByRole("button", { name: "Connect apps", exact: true }).click();
  await expect(page.getByTestId("account-menu-header")).toBeHidden();
  await page.getByRole("button", { name: "Close integrations", exact: true }).click();
  await page.reload();
  await expect(sidebar).toHaveCSS("width", "72px");
  await page.getByTestId("restore-bots-sidebar").click();
  await expect(sidebar).toHaveCSS("width", "240px");

  await page.getByTestId("minimize-bots-sidebar").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(sidebar).toHaveCSS("width", "240px");
  await expect(sidebar.getByTestId("sidebar-search-trigger")).toBeVisible();
  await expect(sidebar.getByRole("textbox", { name: "Search", exact: true })).toHaveCount(0);
  await expect(row.locator("[data-roster-bot-name]")).toBeVisible();
});

test("sidebar resize follows RTL and reduced motion", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await signup(page, `sidebar-rtl-${Date.now()}@rakazo.test`, "password12", "Sidebar Sample");
  await completeOnboarding(page);
  await page.evaluate(() => {
    document.documentElement.dir = "rtl";
  });
  // A viewport change renders the logical sidebar side after changing document direction.
  await page.setViewportSize({ width: 1300, height: 900 });
  const sidebar = page.getByTestId("bots-sidebar");
  await expect(page.getByTestId("bots-sidebar-edge")).toHaveCount(0);
  await expect(sidebar).toHaveCSS("width", "240px");
  await page.getByTestId("minimize-bots-sidebar").click();
  await expect(sidebar).toHaveCSS("width", "72px");
  const row = sidebar.locator("[data-roster-bot-id]").first();
  await row.hover();
  const tooltip = page.locator('[data-slot="tooltip-content"]');
  await expect(tooltip).toBeVisible();
  await expect
    .poll(async () => {
      const label = await tooltip.boundingBox();
      const icon = await row.boundingBox();
      return label && icon ? label.x + label.width <= icon.x : false;
    })
    .toBe(true);
  await captureScreenshot(page, testInfo, "sidebar-mini-avatar-rail-rtl");
  await page.getByTestId("restore-bots-sidebar").click();
  await expect(sidebar).toHaveCSS("width", "240px");
  const box = (await sidebar.boundingBox())!;
  expect(Math.round(box.x + box.width)).toBe(1300);
});

test("narrow desktop keeps the chat width when both panels are open", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 800, height: 900 });
  await signup(page, `sidebar-panels-${Date.now()}@rakazo.test`, "password12", "Sidebar Sample");
  await completeOnboarding(page);
  const sidebar = page.getByTestId("bots-sidebar");
  await expect(sidebar).toHaveCSS("width", "240px");
  await openBotPanelTab(page, "Computer");
  const panel = page.getByTestId("side-panel");
  await expect(panel).toHaveCSS("position", "absolute");
  const chat = page.locator('[data-space-switch="main"]');
  await expect(chat).toHaveCSS("width", "560px");
  await expect(panel).toHaveCSS("width", "320px");
  await captureScreenshot(page, testInfo, "sidebar-narrow-panel-overlay");
  await page.getByTestId("minimize-bots-sidebar").click();
  await expect(sidebar).toHaveCSS("width", "72px");
  await expect(panel).toHaveCSS("position", "relative");
  await expect.poll(async () => (await chat.boundingBox())!.width).toBeGreaterThanOrEqual(320);
});

test("sidebar stays a fixed width when collapsed and restored", async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await signup(page, `sidebar-fixed-${Date.now()}@rakazo.test`, "password12", "Sidebar Sample");
  await completeOnboarding(page);
  const sidebar = page.getByTestId("bots-sidebar");
  await expect(page.getByTestId("bots-sidebar-edge")).toHaveCount(0);
  await expect(sidebar).toHaveCSS("width", "240px");
  await page.getByTestId("minimize-bots-sidebar").click();
  await expect(sidebar).toHaveCSS("width", "72px");
  const path = testInfo.outputPath("sidebar-mini-tight-spacing.png");
  await sidebar.screenshot({ path, animations: "disabled" });
  await testInfo.attach("sidebar-mini-tight-spacing", { contentType: "image/png", path });
  await page.reload();
  await expect(sidebar).toHaveCSS("width", "72px");
  await page.getByTestId("restore-bots-sidebar").click();
  await expect(sidebar).toHaveCSS("width", "240px");
});
