import { expect, test } from "@playwright/test";
import { captureScreenshot } from "./helpers";

const movingParts = (root: Element) =>
  root
    .getAnimations({ subtree: true })
    .filter((track) => track instanceof CSSAnimation && track.playState === "running").length +
  root.querySelectorAll("animate, animateTransform").length;

test("working photo avatars show a ring and stay still", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/e2e/fixtures/avatar-motion.html");

  const working = page.locator(".avatar-working");
  await expect(working).toBeVisible();
  await expect(working).toHaveAttribute("data-working", "true");
  const picture = working.locator(".rakazo-bot-avatar-picture");
  const ring = working.locator(".rakazo-bot-avatar-ring");
  await expect(picture).toBeVisible();
  await expect(ring).toBeVisible();

  const overflow = await working.evaluate((el) => getComputedStyle(el).overflowX);
  const pictureOverflow = await picture.evaluate((el) => getComputedStyle(el).overflowX);
  const ringColor = await ring.locator("circle").evaluate((el) => getComputedStyle(el).stroke);
  const workingColor = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "var(--status-working)";
    document.body.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  expect(overflow).not.toBe("hidden");
  expect(pictureOverflow).toBe("hidden");
  expect(ringColor).toBe(workingColor);

  const snapshot = () =>
    Promise.all([
      ring.evaluate((el) => getComputedStyle(el).transform),
      picture.evaluate((el) => getComputedStyle(el).transform),
    ]);
  const first = await snapshot();
  await page.waitForTimeout(300);
  expect(await snapshot()).toEqual(first);
  expect(await working.evaluate(movingParts)).toBe(0);

  const idle = page.locator(".avatar-idle");
  await expect(idle).toHaveAttribute("data-working", "false");
  await expect(idle.locator(".rakazo-bot-avatar-ring")).toHaveCount(0);
  expect(await idle.evaluate(movingParts)).toBe(0);
  await expect(page.locator(".avatar-shape-idle .rakazo-bot-avatar-ring")).toHaveCSS(
    "opacity",
    "0",
  );
  expect(await page.locator(".avatar-shape-idle").evaluate(movingParts)).toBe(0);
  await captureScreenshot(page, testInfo, "avatar-photo-working-and-idle");
});

test("organic avatars stay still while working", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/e2e/fixtures/avatar-motion.html");

  const avatar = page.locator(".avatar-organic");
  await expect(avatar).toBeVisible();
  expect(await avatar.evaluate(movingParts)).toBe(0);

  await page.getByRole("button", { name: "Idle" }).click();
  await expect(avatar).toHaveAttribute("data-working", "true");
  await page.waitForTimeout(400);
  expect(await avatar.evaluate(movingParts)).toBe(0);
});
