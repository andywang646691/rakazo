import { expect, test } from "@playwright/test";
import { captureScreenshot } from "./helpers";

test("photo working avatars show a visible ring while idle avatars stay plain", async ({
  page,
}, testInfo) => {
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
  const ringAnimation = await ring.evaluate((el: SVGElement) => getComputedStyle(el).animationName);
  const ringColor = await ring.locator("circle").evaluate((el) => getComputedStyle(el).stroke);
  const pictureAnimation = await picture.evaluate((el) => getComputedStyle(el).animationName);
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
  expect(ringAnimation).toBe("rakazo-avatar-spin");
  expect(ringColor).toBe(workingColor);
  expect(pictureAnimation).toBe("rakazo-avatar-breathe");
  const firstPictureTransform = await picture.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(300);
  const secondPictureTransform = await picture.evaluate((el) => getComputedStyle(el).transform);
  expect(secondPictureTransform).not.toBe(firstPictureTransform);

  const idle = page.locator(".avatar-idle");
  await expect(idle).toHaveAttribute("data-working", "false");
  await expect(idle.locator(".rakazo-bot-avatar-ring")).toHaveCount(0);
  await expect(idle.locator(".rakazo-bot-avatar-picture")).toHaveCSS("animation-name", "none");
  await expect(page.locator(".avatar-shape-idle .rakazo-bot-avatar-ring")).toHaveCSS(
    "animation-play-state",
    "paused",
  );
  await captureScreenshot(page, testInfo, "avatar-photo-working-and-idle");
});

test("photo avatar animations stay still when reduced motion is enabled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/e2e/fixtures/avatar-motion.html");

  const avatar = page.locator(".avatar-working");
  await expect(avatar).toBeVisible();
  await expect(avatar).toHaveAttribute("data-working", "true");

  const ring = avatar.locator(".rakazo-bot-avatar-ring");
  const picture = avatar.locator(".rakazo-bot-avatar-picture");
  await expect(ring).toBeVisible();
  const snapshot = () =>
    Promise.all([
      ring.evaluate((el: SVGElement) => ({
        animationName: getComputedStyle(el).animationName,
        transform: getComputedStyle(el).transform,
      })),
      picture.evaluate((el) => ({
        animationName: getComputedStyle(el).animationName,
        transform: getComputedStyle(el).transform,
      })),
    ]);
  const first = await snapshot();
  await page.waitForTimeout(300);
  const second = await snapshot();

  expect(first[0]?.animationName).toBe("none");
  expect(first[1]?.animationName).toBe("none");
  expect(second).toEqual(first);
});

test("organic avatars sway only while working, nod once on finishing, and stop offscreen or hidden", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/e2e/fixtures/avatar-motion.html");
  const avatar = page.locator(".avatar-organic");
  await expect(avatar).toBeVisible();
  const toggle = page.locator(".avatar-organic ~ button");
  // What moves: the outer svg alone, never anything inside it, and never an SMIL clock.
  const motion = () =>
    avatar.evaluate((svg: SVGSVGElement) => ({
      own: svg
        .getAnimations()
        .filter((track) => track instanceof CSSAnimation)
        .map((track) => `${track.animationName}:${track.playState}`),
      inside: svg
        .getAnimations({ subtree: true })
        .filter((track) => track instanceof CSSAnimation && track.effect?.target !== svg).length,
      smil: svg.querySelectorAll("animate, animateTransform").length,
    }));

  // A resting avatar draws no frames.
  await expect(avatar).toHaveAttribute("data-motion", "still");
  expect(await motion()).toEqual({ own: [], inside: 0, smil: 0 });

  // Working: one stepped animation on the svg, which gets its own layer.
  await toggle.click();
  await expect(avatar).toHaveAttribute("data-motion", "running");
  await expect(avatar).toHaveAttribute("data-working", "true");
  const running = await motion();
  expect(running.own).toHaveLength(1);
  expect(running.own[0]).toMatch(/^rakazo-organic-[a-z]+:running$/);
  expect(running.inside).toBe(0);
  expect(running.smil).toBe(0);
  expect(await avatar.evaluate((svg) => getComputedStyle(svg).willChange)).toBe("transform");
  const first = await avatar.evaluate((svg) => getComputedStyle(svg).transform);
  await page.waitForTimeout(350);
  expect(await avatar.evaluate((svg) => getComputedStyle(svg).transform)).not.toBe(first);

  // Offscreen and hidden: nothing is drawn, and it sways again when it comes back.
  const stopped = { own: [], inside: 0, smil: 0 };
  await avatar.evaluate((svg) => {
    svg.closest<HTMLElement>(".avatar-example")!.style.marginTop = "2200px";
  });
  await expect(avatar).toHaveAttribute("data-paused", "true");
  await expect(avatar).toHaveAttribute("data-motion", "still");
  expect(await motion()).toEqual(stopped);
  await avatar.evaluate((svg) => {
    svg.closest<HTMLElement>(".avatar-example")!.style.marginTop = "0";
  });
  await expect(avatar).toHaveAttribute("data-paused", "false");
  await expect(avatar).toHaveAttribute("data-motion", "running");
  const setHidden = (hidden: boolean) =>
    page.evaluate((value) => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => value });
      document.dispatchEvent(new Event("visibilitychange"));
    }, hidden);
  await setHidden(true);
  await expect(avatar).toHaveAttribute("data-paused", "true");
  await expect(avatar).toHaveAttribute("data-motion", "still");
  expect(await motion()).toEqual(stopped);
  await setHidden(false);
  await expect(avatar).toHaveAttribute("data-paused", "false");
  await expect(avatar).toHaveAttribute("data-motion", "running");

  // Finishing: one nod, then still.
  await toggle.click();
  await expect(avatar).toHaveAttribute("data-motion", "finished");
  expect((await motion()).own[0]).toMatch(/^rakazo-organic-nod:/);
  await expect
    .poll(async () => (await motion()).own.filter((track) => track.endsWith(":running")))
    .toEqual([]);
});

test("a waiting organic avatar glows but never moves", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/e2e/fixtures/avatar-motion.html");
  const avatar = page.locator(".avatar-organic-waiting");
  await expect(avatar).toHaveAttribute("data-working", "true");
  await expect(avatar).toHaveAttribute("data-motion", "still");
  expect(await avatar.evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
});

test("organic avatars stay still under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/e2e/fixtures/avatar-motion.html");
  const avatar = page.locator(".avatar-organic");
  await page.locator(".avatar-organic ~ button").click();
  await expect(avatar).toHaveAttribute("data-working", "true");
  await expect(avatar).toHaveAttribute("data-motion", "still");
  expect(await avatar.evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
});
