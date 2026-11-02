// Optional browser verification. Run against the production export, without a dev server.
// IMD_PLAYWRIGHT can name an externally installed Playwright module.
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const pw = await import(
  process.env.IMD_PLAYWRIGHT
    ? pathToFileURL(process.env.IMD_PLAYWRIGHT).href
    : "playwright"
);
const root = resolve("dist");
const out = resolve("test/scratch/browser-check");
await mkdir(out, { recursive: true });
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
};
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(
    new URL(req.url, "http://local").pathname,
  );
  if (!pathname.startsWith("/preview/")) {
    res.writeHead(404).end();
    return;
  }
  const file = resolve(
    root,
    pathname.slice("/preview/".length) || "index.html",
  );
  if (!file.startsWith(root + sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const bytes = await readFile(file);
    res.setHeader(
      "content-type",
      mime[extname(file)] || "application/octet-stream",
    );
    res.end(bytes);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const results = [];
const limitations = [];
const browsers = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, passed: true });
  } catch (e) {
    results.push({ name, passed: false, error: String(e) });
    throw e;
  }
};
const screenshot = (page, name) =>
  page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
try {
  const browser = await pw.chromium.launch({ headless: true });
  browsers.push(browser);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors = [],
    failures = [],
    external = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  await page.route("**/*", (route) => {
    const u = route.request().url();
    if (
      u.startsWith(new URL(url).origin) ||
      u.startsWith("blob:") ||
      u.startsWith("data:")
    )
      return route.continue();
    external.push(u);
    return route.abort();
  });
  await check(
    "production export loads at /preview/ with local fonts and share card",
    async () => {
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(
        await page.title(),
        "Squeekrider Odyssey · Small rider. Big adventure.",
      );
      assert.equal(
        await page.evaluate(
          () =>
            document.fonts.check('600 16px "Bricolage Grotesque"') &&
            document.fonts.check('400 16px "DM Sans"'),
        ),
        true,
      );
      const share = await page.request.get(url + "share.png");
      assert.equal(share.status(), 200);
      assert.ok((await share.body()).length > 1000);
    },
  );
  await check(
    "product and start action visible on first 390 screen",
    async () => {
      const box = await page
        .getByRole("button", { name: "Start riding", exact: true })
        .boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height < 844);
      assert.equal(await page.locator("canvas").isVisible(), true);
      await screenshot(page, "390-ready");
    },
  );
  await check(
    "start, keyboard double jump, pause, frozen score, and resume",
    async () => {
      await page
        .getByRole("button", { name: "Start riding", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          Number(
            document
              .querySelector(".distance strong")
              .textContent.replaceAll(",", ""),
          ) > 3,
      );
      assert.equal(
        await page
          .locator("canvas")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      await page.keyboard.press("Space");
      await page.waitForTimeout(150);
      await page.keyboard.press("ArrowUp");
      await screenshot(page, "390-riding");
      await page.keyboard.press("p");
      await page.getByRole("button", { name: "Resume ride" }).waitFor();
      const distance = await page.locator(".distance").innerText();
      await page.waitForTimeout(400);
      assert.equal(await page.locator(".distance").innerText(), distance);
      assert.equal(
        await page
          .getByRole("button", { name: "Select Cactus pass, A little lively" })
          .isDisabled(),
        true,
      );
      await screenshot(page, "390-paused");
      await page.keyboard.press("p");
      await page.locator(".phase-riding").waitFor();
      await page.keyboard.press("Escape");
      await page.getByRole("button", { name: "Resume ride" }).waitFor();
      await page.getByRole("button", { name: "Resume ride" }).click();
      await page.locator(".phase-riding").waitFor();
    },
  );
  await check(
    "tap trail and visible Jump button both work during play",
    async () => {
      await page.locator("canvas").tap({ position: { x: 200, y: 220 } });
      await page.getByRole("button", { name: "Jump", exact: true }).click();
      await page.getByRole("button", { name: "Pause ride" }).click();
      await page.getByRole("button", { name: "Finish this ride" }).click();
      await page.getByRole("button", { name: "Ride again" }).waitFor();
      assert.equal(await page.locator("#ride-log tbody tr").count(), 1);
      await screenshot(page, "390-finished");
    },
  );
  await check(
    "retry and a real obstacle collision save another ride",
    async () => {
      await page.getByRole("button", { name: "Ride again" }).click();
      await page
        .getByRole("button", { name: "Ride again" })
        .waitFor({ timeout: 16000 });
      assert.equal(await page.locator("#ride-log tbody tr").count(), 2);
    },
  );
  await check(
    "help dialog traps focus, closes with Escape, and restores focus",
    async () => {
      await page
        .getByRole("button", { name: "How to play", exact: true })
        .first()
        .click();
      assert.equal(await page.getByRole("dialog").isVisible(), true);
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
        assert.equal(
          await page.evaluate(() =>
            document.querySelector("dialog").contains(document.activeElement),
          ),
          true,
        );
      }
      await screenshot(page, "390-help");
      await page.keyboard.press("Escape");
      assert.equal(await page.getByRole("dialog").isVisible(), false);
      assert.equal(
        await page
          .getByRole("button", { name: "How to play", exact: true })
          .first()
          .evaluate((el) => el === document.activeElement),
        true,
      );
    },
  );
  await check(
    "all trails select, recolor, and run; moon palette remains readable",
    async () => {
      for (const [name, id] of [
        ["Cactus pass, A little lively", "cactus"],
        ["Moonlit mesa, Feeling brave", "moon"],
      ]) {
        await page.getByRole("button", { name: `Select ${name}` }).click();
        assert.equal(await page.locator(`.trail-${id}`).count(), 1);
        await page.locator("#ride").scrollIntoViewIfNeeded();
        if (id === "moon") await screenshot(page, "390-moon-ready");
        await page
          .getByRole("button", { name: "Start riding", exact: true })
          .click();
        await page.getByRole("button", { name: "Pause ride" }).click();
        await page.getByRole("button", { name: "Finish this ride" }).click();
      }
      assert.equal(await page.locator("#ride-log tbody tr").count(), 4);
    },
  );
  await check(
    "ride log filters, sorting, CSV download, reload persistence",
    async () => {
      const selects = page.locator("#ride-log select");
      await selects.nth(0).selectOption("moon");
      assert.equal(await page.locator("#ride-log tbody tr").count(), 1);
      await selects.nth(0).selectOption("all");
      await selects.nth(1).selectOption("best");
      const values = await page
        .locator("#ride-log tbody tr td:nth-child(2)")
        .allTextContents();
      const numbers = values.map((v) => Number(v.replace(/[^\d]/g, "")));
      assert.deepEqual(
        numbers,
        [...numbers].sort((a, b) => b - a),
      );
      const pending = page.waitForEvent("download");
      await page.getByRole("button", { name: "Export log" }).click();
      const download = await pending;
      assert.equal(download.suggestedFilename(), "squeekrider-ride-log.csv");
      await download.saveAs(`${out}/ride-log.csv`);
      const csv = await readFile(`${out}/ride-log.csv`, "utf8");
      assert.equal(csv.split("\r\n").length, 5);
      await page.reload();
      assert.equal(await page.locator("#ride-log tbody tr").count(), 4);
      await page.locator("#ride-log").scrollIntoViewIfNeeded();
      await screenshot(page, "390-log");
    },
  );
  await check(
    "clear log requires confirmation, cancel preserves rides, confirm resets best",
    async () => {
      await page
        .getByRole("button", { name: "Clear ride log", exact: true })
        .click();
      await page.getByRole("button", { name: "Keep my rides" }).click();
      assert.equal(await page.locator("#ride-log tbody tr").count(), 4);
      await page
        .getByRole("button", { name: "Clear ride log", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Clear ride log" })
        .click();
      assert.equal(await page.locator("#ride-log tbody tr").count(), 0);
      await page.reload();
      assert.equal(await page.locator("#ride-log tbody tr").count(), 0);
    },
  );
  await check("sound toggles and saved choice persists", async () => {
    await page.getByRole("button", { name: "Turn sound on" }).click();
    await page.getByRole("button", { name: "Turn sound off" }).waitFor();
    await page.reload();
    assert.equal(
      await page
        .getByRole("button", { name: "Turn sound off" })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.getByRole("button", { name: "Turn sound off" }).click();
  });
  await check(
    "responsive layouts, anchors, keyboard focus, and reduced motion",
    async () => {
      for (const width of [320, 390, 600, 820, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
          `overflow at ${width}`,
        );
        await screenshot(page, `responsive-${width}`);
      }
      await page
        .getByRole("link", { name: "Field guide", exact: true })
        .click();
      assert.ok(page.url().endsWith("#field-guide"));
      await page.goto(url);
      await page.keyboard.press("Tab");
      assert.equal(
        await page
          .getByRole("link", { name: "Skip to the ride" })
          .evaluate((el) => el === document.activeElement),
        true,
      );
      await screenshot(page, "keyboard-focus");
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await page.evaluate(
          () => getComputedStyle(document.documentElement).scrollBehavior,
        ),
        "auto",
      );
      await screenshot(page, "reduced-motion");
    },
  );
  await check(
    "corrupt and maximum-length saved records render without overflow",
    async () => {
      await page.evaluate(() =>
        localStorage.setItem("squeekrider-odyssey-v1", "{invalid"),
      );
      await page.reload();
      assert.equal(await page.locator("#ride-log tbody tr").count(), 0);
      await page.evaluate(() =>
        localStorage.setItem(
          "squeekrider-odyssey-v1",
          JSON.stringify({
            rides: Array.from({ length: 20 }, (_, i) => ({
              id: `max-${i}`,
              trail: ["valley", "cactus", "moon"][i % 3],
              distance: 999999,
              cheese: 9999,
              date: Date.now() - i * 86400000,
            })),
          }),
        ),
      );
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        await page.reload();
        assert.equal(await page.locator("#ride-log tbody tr").count(), 20);
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
        await page.locator("#ride-log").scrollIntoViewIfNeeded();
        await screenshot(page, `max-records-${width}`);
      }
    },
  );
  await check(
    "unavailable storage gives honest notice and still permits play",
    async () => {
      const isolated = await browser.newContext({
        viewport: { width: 390, height: 844 },
      });
      await isolated.addInitScript(() => {
        Storage.prototype.getItem = () => {
          throw new DOMException("Blocked", "SecurityError");
        };
        Storage.prototype.setItem = () => {
          throw new DOMException("Blocked", "SecurityError");
        };
      });
      const p = await isolated.newPage();
      await p.goto(url);
      assert.equal(
        await p
          .getByText("Storage unavailable. Records last this visit.")
          .isVisible(),
        true,
      );
      await p
        .getByRole("button", { name: "Start riding", exact: true })
        .click();
      await p.locator(".phase-riding").waitFor();
      await isolated.close();
    },
  );
  if (process.env.AXE_SCRIPT)
    await check(
      "automated accessibility scan: ready, help, moon, paused, and finished states",
      async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(url);
        await page.addScriptTag({ path: process.env.AXE_SCRIPT });
        const reports = [];
        const scan = async (state) => {
          const report = await page.evaluate(() =>
            window.axe.run(document, {
              runOnly: {
                type: "tag",
                values: [
                  "wcag2a",
                  "wcag2aa",
                  "wcag21aa",
                  "wcag22aa",
                  "best-practice",
                ],
              },
            }),
          );
          reports.push({
            state,
            violations: report.violations,
            incomplete: report.incomplete.map((r) => ({
              id: r.id,
              nodes: r.nodes.length,
            })),
            passes: report.passes.length,
          });
          await writeFile(
            `${out}/accessibility.json`,
            JSON.stringify(reports, null, 2),
          );
          assert.deepEqual(
            report.violations.map((r) => ({
              id: r.id,
              impact: r.impact,
              nodes: r.nodes.map((n) => n.target),
            })),
            [],
            state,
          );
        };
        await scan("ready with maximum records");
        await page
          .getByRole("button", { name: "How to play", exact: true })
          .first()
          .click();
        await scan("help dialog");
        await page.keyboard.press("Escape");
        await page
          .getByRole("button", { name: "Select Moonlit mesa, Feeling brave" })
          .click();
        await scan("moon ready");
        await page
          .getByRole("button", { name: "Start riding", exact: true })
          .click();
        await page.evaluate(() => window.dispatchEvent(new Event("blur")));
        await page.getByRole("button", { name: "Resume ride" }).waitFor();
        await scan("paused after simulated window blur");
        await page.getByRole("button", { name: "Finish this ride" }).click();
        await scan("finished");
      },
    );
  await check(
    "no browser errors, missing resources, or runtime external requests",
    async () => {
      assert.deepEqual(errors, []);
      assert.deepEqual(failures, []);
      assert.deepEqual(external, []);
    },
  );
  await context.close();
  // WebKit availability is optional in this runtime; report it precisely.
  let webkit;
  try {
    webkit = await pw.webkit.launch({ headless: true });
    browsers.push(webkit);
  } catch (e) {
    limitations.push(
      "WebKit could not launch: " + String(e).split("\n").slice(0, 3).join(" "),
    );
  }
  if (webkit)
    await check(
      "WebKit mobile start, jump, pause, resume, help, and static subpath",
      async () => {
        const p = await webkit.newPage({
          viewport: { width: 390, height: 844 },
        });
        await p.goto(url);
        await p
          .getByRole("button", { name: "Start riding", exact: true })
          .click();
        await p.keyboard.press("Space");
        await p.getByRole("button", { name: "Pause ride" }).click();
        await p.getByRole("button", { name: "Resume ride" }).click();
        await p
          .getByRole("button", { name: "How to play", exact: true })
          .first()
          .click();
        assert.equal(await p.getByRole("dialog").isVisible(), true);
        await p.keyboard.press("Escape");
        await screenshot(p, "webkit-390");
        await p.close();
      },
    );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  for (const browser of browsers) await browser.close();
  await new Promise((done) => server.close(done));
  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ results, limitations }, null, 2),
  );
  console.log(JSON.stringify({ results, limitations }, null, 2));
}
