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

const organic = (page: import("@playwright/test").Page) => page.locator(".avatar-organic");
const step = (page: import("@playwright/test").Page, label: string) =>
  page.getByRole("button", { name: label, exact: true }).click();
// What moves on the svg itself, and how many animations run anywhere inside it.
const motion = (avatar: import("@playwright/test").Locator) =>
  avatar.evaluate((svg: SVGSVGElement) => ({
    own: svg
      .getAnimations()
      .filter((track) => track instanceof CSSAnimation)
      .map((track) => `${(track as CSSAnimation).animationName}:${track.playState}`),
    inside: svg
      .getAnimations({ subtree: true })
      .filter((track) => track instanceof CSSAnimation && track.effect?.target !== svg).length,
    smil: svg.querySelectorAll("animate, animateTransform").length,
  }));
const matrix = (avatar: import("@playwright/test").Locator, selector: string) =>
  avatar.evaluate((svg, sel) => {
    const m = new DOMMatrix(getComputedStyle(svg.querySelector(sel)!).transform);
    return { a: m.a, b: m.b, d: m.d, e: m.e, f: m.f };
  }, selector);

test.describe("organic avatar", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/e2e/fixtures/avatar-motion.html");
    await expect(organic(page)).toBeVisible();
  });

  test("is a leaning, still picture at rest with its eyes turned up", async ({ page }) => {
    const avatar = organic(page);
    await expect(avatar).toHaveAttribute("data-phase", "rest");
    await page.waitForTimeout(600);
    expect(await motion(avatar)).toEqual({ own: [], inside: 0, smil: 0 });
    const turn = await matrix(avatar, ".rakazo-organic-avatar-turn");
    expect(Math.atan2(turn.b, turn.a) * (180 / Math.PI)).toBeCloseTo(-18, 0);
    const pose = await matrix(avatar, ".rakazo-organic-avatar-pose");
    expect([pose.e, pose.f]).toEqual([-5, -5]);
  });

  test("flattens into three dots, then comes back alive and breathes", async ({ page }) => {
    const avatar = organic(page);
    await step(page, "Dots");
    await expect(avatar).toHaveAttribute("data-phase", "dots");
    await page.waitForTimeout(900);
    const turn = await matrix(avatar, ".rakazo-organic-avatar-turn");
    expect(turn.d).toBeCloseTo(0.32, 1);
    expect(Math.abs(turn.b)).toBeLessThan(0.01);
    const opacity = (sel: string) =>
      avatar.evaluate((svg, s) => getComputedStyle(svg.querySelector(s)!).opacity, sel);
    expect(await opacity(".rakazo-organic-avatar-dot-center")).toBe("1");
    expect(await opacity(".rakazo-organic-avatar-body-idle")).toBe("0");
    expect(await opacity(".rakazo-organic-avatar-pose")).toBe("0");
    const left = await matrix(avatar, ".rakazo-organic-avatar-dot-left");
    const right = await matrix(avatar, ".rakazo-organic-avatar-dot-right");
    expect(left.e).toBeCloseTo(-38, 0);
    expect(right.e).toBeCloseTo(38, 0);
    expect(await motion(avatar)).toEqual({ own: [], inside: 0, smil: 0 });

    await step(page, "Alive");
    await expect(avatar).toHaveAttribute("data-phase", "alive");
    await page.waitForTimeout(500);
    expect(await opacity(".rakazo-organic-avatar-dot-center")).toBe("0");
    expect(await opacity(".rakazo-organic-avatar-body-idle")).toBe("1");
    const alive = await motion(avatar);
    expect(alive.own).toEqual(["rakazo-organic-breathe:running"]);
    expect(alive.inside).toBe(0);
    expect(alive.smil).toBe(0);
    expect(await avatar.evaluate((svg) => getComputedStyle(svg).willChange)).toBe("transform");
    const first = await avatar.evaluate((svg) => getComputedStyle(svg).transform);
    await page.waitForTimeout(700);
    expect(await avatar.evaluate((svg) => getComputedStyle(svg).transform)).not.toBe(first);
  });

  test("blinks while alive, and nods once when the work ends", async ({ page }) => {
    const avatar = organic(page);
    // A blink lasts 140ms, shorter than a poll: record it as it happens.
    await avatar.evaluate((svg) => {
      const log: string[] = [];
      (window as unknown as { blinks: string[] }).blinks = log;
      new MutationObserver(() => log.push(svg.dataset.blink ?? "open")).observe(svg, {
        attributes: true,
        attributeFilter: ["data-blink"],
      });
    });
    await step(page, "Alive");
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { blinks: string[] }).blinks), {
        timeout: 9000,
      })
      .toEqual(["true", "open"]);
    await step(page, "Rest");
    await expect(avatar).toHaveAttribute("data-phase", "finish");
    expect((await motion(avatar)).own[0]).toMatch(/^rakazo-organic-nod:/);
    await expect
      .poll(async () => (await motion(avatar)).own.filter((track) => track.endsWith(":running")))
      .toEqual([]);
  });

  test("turns its eyes to the pointer over its row, and back when the pointer leaves", async ({
    page,
  }) => {
    const avatar = organic(page);
    const box = (await avatar.boundingBox())!;
    await page.mouse.move(box.x + box.width - 14, box.y + box.height / 2 - 10);
    await page.mouse.move(box.x + box.width - 8, box.y + box.height / 2 - 10);
    await expect
      .poll(async () => (await matrix(avatar, ".rakazo-organic-avatar-pose")).e)
      .toBeGreaterThan(-5);
    await page.mouse.move(2, 2);
    await expect
      .poll(async () => {
        const pose = await matrix(avatar, ".rakazo-organic-avatar-pose");
        return [pose.e, pose.f];
      })
      .toEqual([-5, -5]);
    expect(await avatar.evaluate((svg) => svg.style.getPropertyValue("--logo-gaze-x"))).toBe("");
  });

  test("a badge never moves, whatever the bot does", async ({ page }) => {
    const badge = page.locator(".avatar-organic-badge");
    await expect(badge).toHaveAttribute("data-phase", "rest");
    expect(await motion(badge)).toEqual({ own: [], inside: 0, smil: 0 });
  });

  test("stops drawing offscreen and in a hidden tab", async ({ page }) => {
    const avatar = organic(page);
    await step(page, "Alive");
    await expect(avatar).toHaveAttribute("data-phase", "alive");
    await avatar.evaluate((svg) => {
      svg.closest<HTMLElement>(".avatar-example")!.style.marginTop = "2200px";
    });
    await expect(avatar).toHaveAttribute("data-paused", "true");
    await expect(avatar).toHaveAttribute("data-phase", "rest");
    expect(await motion(avatar)).toEqual({ own: [], inside: 0, smil: 0 });
    await avatar.evaluate((svg) => {
      svg.closest<HTMLElement>(".avatar-example")!.style.marginTop = "0";
    });
    await expect(avatar).toHaveAttribute("data-phase", "alive");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(avatar).toHaveAttribute("data-phase", "rest");
  });

  test("a waiting bot glows but never moves", async ({ page }) => {
    const avatar = page.locator(".avatar-organic-waiting");
    await expect(avatar).toHaveAttribute("data-working", "true");
    await expect(avatar).toHaveAttribute("data-phase", "rest");
    expect(await motion(avatar)).toEqual({ own: [], inside: 0, smil: 0 });
  });
});

test("organic avatars stay still under reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/e2e/fixtures/avatar-motion.html");
  await step(page, "Dots");
  await expect(organic(page)).toHaveAttribute("data-phase", "rest");
  await step(page, "Alive");
  await expect(organic(page)).toHaveAttribute("data-phase", "rest");
  expect(await motion(organic(page))).toEqual({ own: [], inside: 0, smil: 0 });
});
