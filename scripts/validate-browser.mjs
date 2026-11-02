// Verify the committed static export at a gateway-style subpath. Test fixtures never enter dist/.
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
const root = resolve("dist"),
  out = resolve("test/scratch/browser-check");
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
    ),
    file = resolve(root, pathname.slice("/preview/".length) || "index.html");
  if (!pathname.startsWith("/preview/") || !file.startsWith(root + sep)) {
    res.writeHead(404).end();
    return;
  }
  try {
    res.setHeader(
      "Content-Type",
      mime[extname(file)] || "application/octet-stream",
    );
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const results = [],
  browsers = [];
let failed = false;
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`PASS ${name}`);
  } catch (e) {
    results.push({ name, passed: false, error: String(e) });
    console.error(`FAIL ${name}: ${e}`);
    failed = true;
  }
}
const until = async (fn, message, ms = 3000) => {
  const start = Date.now();
  while (Date.now() - start < ms) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw Error(message);
};
const profile = (coins = 0, levels = { cannon: 1, jetpack: 1, armor: 1 }) => ({
  coins,
  levels,
});
const seed = async (page, value) =>
  page.addInitScript(
    (value) =>
      localStorage.setItem(
        "squeekrider-royal-garage-v2",
        JSON.stringify(value),
      ),
    value,
  );
const shot = async (page, name) =>
  page.screenshot({ path: `${out}/${name}.png`, fullPage: false });
const axe = async (page, label) => {
  if (!process.env.AXE_SCRIPT) return;
  await page.addScriptTag({ path: process.env.AXE_SCRIPT });
  const r = await page.evaluate(
    async () =>
      await window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      }),
  );
  await writeFile(
    `${out}/axe-${label}.json`,
    JSON.stringify(r.violations, null, 2),
  );
  assert.deepEqual(
    r.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
    [],
  );
};
async function fixtures(
  page,
  { state = "SPINNING", settlements = "77", fail = false, stale = false } = {},
) {
  const control = {
    state,
    settlements,
    fail,
    stale,
    calls: [],
    httpError: false,
    malformed: false,
  };
  await page.route("https://api.squeekchain.com/**", async (route) => {
    const kind = route.request().url().endsWith("/status")
      ? "status"
      : "economy";
    control.calls.push({
      kind,
      at: Date.now(),
      method: route.request().method(),
    });
    if (control.fail) {
      await route.abort("failed");
      return;
    }
    if (control.httpError) {
      await route.fulfill({ status: 503, body: "unavailable" });
      return;
    }
    const body =
      kind === "status"
        ? {
            measurement: {
              coreStatus: control.state,
              rpmMilli: control.state === "SPINNING" ? 125000 : 0,
              observedAt: new Date(
                Date.now() - (control.stale ? 180000 : 0),
              ).toISOString(),
              freshness: "online",
              staleAfterSeconds: 120,
            },
            builder: { anchor: { blockHeight: "6808" } },
          }
        : control.settlements === null
          ? { schemaVersion: 2 }
          : { totalSettlements: control.settlements };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(control.malformed ? {} : body),
    });
  });
  return control;
}
try {
  const browser = await pw.chromium.launch({ headless: true });
  browsers.push(browser);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    acceptDownloads: true,
  });
  const page = await context.newPage(),
    errors = [],
    localFailures = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("response", (r) => {
    if (r.url().startsWith(url) && r.status() >= 400)
      localFailures.push(r.url());
  });
  await fixtures(page, { state: "IDLE", settlements: null });
  await page.goto(url);
  await page.waitForSelector(".connection.is-live");
  await page.evaluate(() => document.fonts.ready);
  await check(
    "390px first screen contains the game and primary action",
    async () => {
      const b = await page
        .getByRole("button", { name: "Start riding", exact: true })
        .boundingBox();
      assert.ok(b && b.y > 0 && b.y + b.height < 844);
      assert.equal(await page.locator("canvas").count(), 1);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await shot(page, "mobile-ready");
      await axe(page, "ready");
    },
  );
  await check(
    "real field names, missing settlements and idle turbo standby",
    async () => {
      assert.match(await page.locator(".chain-values").innerText(), /IDLE/);
      assert.match(await page.locator(".chain-values").innerText(), /6,808/);
      assert.match(
        await page.locator(".missing-data").innerText(),
        /does not currently report totalSettlements/,
      );
      assert.match(
        await page.locator(".turbo-toggle").innerText(),
        /wheel idle/,
      );
    },
  );
  await check(
    "start, nitro press/release, hover, dive, keyboard and touch controls",
    async () => {
      await page
        .getByRole("button", { name: "Start riding", exact: true })
        .click();
      await page.waitForSelector(".phase-riding");
      assert.ok((await page.locator(".game-shell").boundingBox()).y < 40);
      const base = Number(
        await page
          .locator(".speedometer strong")
          .innerText()
          .then((v) => v.replace(/\D/g, "")),
      );
      await page.keyboard.down("ArrowRight");
      await page.waitForTimeout(160);
      assert.match(
        await page.locator(".drive-state").innerText(),
        /Nitro 1.55/,
      );
      const boost = Number(
        await page
          .locator(".speedometer strong")
          .innerText()
          .then((v) => v.replace(/\D/g, "")),
      );
      assert.ok(boost >= base * 1.45);
      await page.keyboard.up("ArrowRight");
      await page.waitForTimeout(100);
      assert.match(
        await page.locator(".drive-state").innerText(),
        /auto-firing/,
      );
      await page.keyboard.down("w");
      await page.waitForTimeout(300);
      assert.ok(
        await page
          .locator("progress[aria-label='Thruster fuel']")
          .evaluate((e) => e.value < 1),
      );
      await page.keyboard.up("w");
      await page.keyboard.down("s");
      await page.waitForTimeout(350);
      await page.keyboard.up("s");
      await page.keyboard.press("a");
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press(" ");
      const up = page.getByRole("button", { name: /Fly up and jump/ });
      await up.tap();
      await page.locator("canvas").click({ position: { x: 260, y: 120 } });
      await page.keyboard.press("f");
      await page.keyboard.press("p");
      await page.waitForSelector(".phase-paused");
      const distance = await page.locator(".ride-hud").innerText();
      await page.waitForTimeout(200);
      assert.equal(await page.locator(".ride-hud").innerText(), distance);
      await page
        .getByRole("button", { name: "Resume ride", exact: true })
        .click();
      await page.waitForSelector(".phase-riding");
    },
  );
  await check(
    "E and Q invoke special weapons with independent cooldowns",
    async () => {
      await page.keyboard.press("e");
      await until(
        async () =>
          /8s|7s/.test(
            await page.locator(".weapon-button").first().innerText(),
          ),
        "Bomb cooldown not started",
      );
      await page.keyboard.press("q");
      await until(
        async () =>
          /12s|11s/.test(
            await page.locator(".weapon-button").last().innerText(),
          ),
        "Storm cooldown not started",
      );
      assert.equal(
        await page.locator(".weapon-button").first().isDisabled(),
        true,
      );
      assert.equal(
        await page.locator(".weapon-button").last().isDisabled(),
        true,
      );
      await shot(page, "mobile-playing");
      await page.keyboard.press("p");
    },
  );
  await check(
    "modal pauses play, traps keyboard focus, closes with Escape and restores opener",
    async () => {
      await page
        .getByRole("button", { name: "Resume ride", exact: true })
        .click();
      await page
        .locator("header")
        .getByRole("button", { name: "How to play", exact: true })
        .click();
      assert.equal(await page.locator("dialog").evaluate((e) => e.open), true);
      assert.equal(await page.locator(".phase-paused").count(), 1);
      await page.getByRole("button", { name: "Close dialog" }).focus();
      await page.keyboard.press("Shift+Tab");
      assert.equal(
        await page.evaluate(() => document.activeElement.textContent.trim()),
        "Ready to ride",
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.getAttribute("aria-label"),
        ),
        "Close dialog",
      );
      await axe(page, "help");
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("dialog").evaluate((e) => e.open), false);
      assert.equal(
        await page.evaluate(() =>
          document.activeElement.getAttribute("aria-label"),
        ),
        "How to play",
      );
    },
  );
  await check(
    "finish, persisted ride log, CSV export, filters and safe clear",
    async () => {
      await page
        .getByRole("button", { name: "Finish this ride", exact: true })
        .click();
      await page.waitForSelector(".phase-finished");
      assert.ok((await page.locator("tbody tr").count()) > 0);
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Export log" }).click();
      const dl = await downloadPromise;
      assert.equal(dl.suggestedFilename(), "squeekrider-ride-log.csv");
      assert.match(
        await readFile(await dl.path(), "utf8"),
        /Cheese Coins,Date \(UTC\)/,
      );
      await page
        .getByRole("combobox", { name: "Trail", exact: true })
        .selectOption("moon");
      assert.match(await page.locator(".log-empty").innerText(), /No rides/);
      await page
        .getByRole("combobox", { name: "Trail", exact: true })
        .selectOption("all");
      await page
        .getByRole("combobox", { name: "Sort by", exact: true })
        .selectOption("best");
      await page
        .getByRole("button", { name: "Clear ride log", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Keep rides", exact: true })
        .click();
      assert.ok((await page.locator("tbody tr").count()) > 0);
      const bank = await page.locator(".coin-bank strong").innerText();
      await page
        .getByRole("button", { name: "Clear ride log", exact: true })
        .click();
      await page
        .locator("dialog")
        .getByRole("button", { name: "Clear ride log", exact: true })
        .click();
      assert.equal(await page.locator("tbody tr").count(), 0);
      assert.equal(await page.locator(".coin-bank strong").innerText(), bank);
    },
  );
  await check(
    "API polling performs GET on both endpoints at 15s and turbo follows spinning telemetry",
    async () => {
      const p = await context.newPage();
      await p.clock.install();
      const f = await fixtures(p, { state: "IDLE", settlements: "77" });
      await p.goto(url);
      await p.waitForSelector(".connection.is-live");
      const before = f.calls.length;
      f.state = "SPINNING";
      f.settlements = "999";
      await p.clock.fastForward(15_050);
      await until(
        async () => f.calls.length >= before + 2,
        "15s interval did not request both endpoints",
      );
      await until(
        async () =>
          /SPINNING/.test(await p.locator(".chain-values").innerText()),
        "Spinning status not rendered",
      );
      assert.match(await p.locator(".chain-values").innerText(), /999/);
      assert.ok(f.calls.every((c) => c.method === "GET"));
      assert.match(await p.locator(".turbo-toggle").innerText(), /Active/);
      await p.getByLabel("Live Wheel Turbo").uncheck();
      assert.match(await p.locator(".turbo-toggle").innerText(), /Off/);
      await p.getByLabel("Live Wheel Turbo").check();
      f.fail = true;
      await p.getByRole("button", { name: "Refresh data" }).click();
      await until(
        async () => /Stale/.test(await p.locator(".connection").innerText()),
        "Failed feed not marked stale",
      );
      assert.match(await p.locator(".chain-values").innerText(), /SPINNING/);
      assert.match(
        await p.locator(".turbo-toggle").innerText(),
        /waiting for data/,
      );
      f.fail = false;
      f.stale = true;
      await p.getByRole("button", { name: "Refresh data" }).click();
      await p.waitForTimeout(100);
      assert.match(
        await p.locator(".turbo-toggle").innerText(),
        /waiting for data/,
      );
      f.stale = false;
      await p.getByRole("button", { name: "Refresh data" }).click();
      await until(
        async () => /Active/.test(await p.locator(".turbo-toggle").innerText()),
        "Feed failed to recover",
      );
      await p.close();
    },
  );
  await check(
    "garage upgrades cost 40, pause a ride, persist levels and reach rank five",
    async () => {
      const p = await context.newPage();
      await fixtures(p);
      await seed(p, profile(480));
      await p.goto(url);
      await p
        .getByRole("button", { name: "Start riding", exact: true })
        .click();
      await p
        .getByRole("button", {
          name: "Upgrade cannon for 40 Cheese Coins",
          exact: true,
        })
        .click();
      assert.equal(await p.locator(".phase-paused").count(), 1);
      assert.equal(await p.locator(".coin-bank strong").innerText(), "440");
      assert.match(await p.locator(".upgrade-cannon").innerText(), /16 damage/);
      for (let i = 0; i < 3; i++)
        await p
          .getByRole("button", {
            name: "Upgrade cannon for 40 Cheese Coins",
            exact: true,
          })
          .click();
      for (const kind of ["jetpack", "armor"])
        for (let i = 0; i < 4; i++)
          await p
            .getByRole("button", {
              name: `Upgrade ${kind} for 40 Cheese Coins`,
              exact: true,
            })
            .click();
      assert.equal(await p.locator(".coin-bank strong").innerText(), "0");
      assert.match(
        await p.locator(".rank-info").innerText(),
        /Level 5 · Supreme Wheel Monarch/,
      );
      assert.match(await p.locator(".upgrade-jetpack").innerText(), /6 jumps/);
      assert.match(
        await p.locator(".upgrade-armor").innerText(),
        /200 maximum HP/,
      );
      assert.equal(
        await p.locator(".upgrade .secondary-button:disabled").count(),
        3,
      );
      await shot(p, "garage-monarch");
      await axe(p, "garage");
      // Stop reseeding before the reload: persistence is tested, rather than replaced by a fixture.
      await p.evaluate(() => sessionStorage.setItem("checked", "yes"));
      const stored = await p.evaluate(() =>
        localStorage.getItem("squeekrider-royal-garage-v2"),
      );
      assert.equal(JSON.parse(stored).levels.armor, 5);
      const q = await context.newPage();
      await fixtures(q);
      await q.goto(url);
      assert.match(
        await q.locator(".rank-info").innerText(),
        /Supreme Wheel Monarch/,
      );
      await q.close();
      await p.close();
    },
  );
  await check(
    "Boss Rush spawns Cat-Blimp immediately, aim and abilities damage its health",
    async () => {
      const p = await context.newPage();
      await fixtures(p);
      await seed(p, profile(0, { cannon: 5, jetpack: 5, armor: 5 }));
      await p.goto(url);
      await p.getByRole("button", { name: "Boss Rush", exact: true }).click();
      await p.waitForSelector(".boss-health");
      assert.match(
        await p.locator(".boss-health").innerText(),
        /Baron Von Claw/,
      );
      assert.ok(
        Number(
          (await p.locator(".ride-hud strong").first().innerText()).replace(
            /,/g,
            "",
          ),
        ) < 100,
      );
      await p.locator(".weapon-button").first().click();
      await p.locator(".weapon-button").last().click();
      await until(
        async () =>
          await p
            .locator(".boss-health progress")
            .evaluate((e) => e.value < 420),
        "Special attacks did not damage boss",
      );
      await p.locator("canvas").focus();
      await p.keyboard.down("w");
      const start = Date.now();
      while (
        Date.now() - start < 11000 &&
        (await p.locator(".phase-riding").count())
      ) {
        // Aim at the visible blimp's flight band using canvas coordinates, as a player would.
        const c = await p.locator("canvas").boundingBox(),
          elapsed = (Date.now() - start) / 1000;
        await p.mouse.move(
          c.x + c.width - (108 / 440) * c.height,
          c.y +
            c.height * 0.84 +
            ((-190 + Math.sin((elapsed + 0.5) * 1.5) * 62) / 440) * c.height,
        );
        await p.waitForTimeout(120);
      }
      await p.keyboard.up("w");
      await shot(p, "boss-battle");
      assert.equal(await p.locator(".phase-finished").count(), 1);
      assert.match(
        await p.locator(".state-content").innerText(),
        /The Baron is toast/,
      );
      await p.close();
    },
  );
  await check(
    "sound creates native synth oscillators, then mute silences new effects",
    async () => {
      const p = await context.newPage();
      await fixtures(p);
      await p.addInitScript(() => {
        window.__tones = 0;
        const create = AudioContext.prototype.createOscillator;
        AudioContext.prototype.createOscillator = function () {
          window.__tones++;
          return create.call(this);
        };
      });
      await p.goto(url);
      await p
        .getByRole("button", { name: "Enable sound", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Start riding", exact: true })
        .click();
      await p.waitForTimeout(500);
      assert.ok((await p.evaluate(() => window.__tones)) >= 3);
      await p.getByRole("button", { name: "Mute sound", exact: true }).click();
      const count = await p.evaluate(() => window.__tones);
      await p.waitForTimeout(500);
      assert.equal(await p.evaluate(() => window.__tones), count);
      await p.close();
    },
  );
  await check(
    "offline, malformed response, service error and recovery remain usable",
    async () => {
      const p = await context.newPage(),
        f = await fixtures(p, { fail: true });
      await p.goto(url);
      await until(
        async () => /Offline/.test(await p.locator(".connection").innerText()),
        "Offline not shown",
      );
      assert.match(
        await p.locator(".missing-data").innerText(),
        /Economy readings unavailable/,
      );
      assert.doesNotMatch(
        await p.locator(".missing-data").innerText(),
        /does not currently report/,
      );
      await p
        .getByRole("button", { name: "Start riding", exact: true })
        .click();
      assert.equal(await p.locator(".phase-riding").count(), 1);
      await p.keyboard.press("p");
      f.fail = false;
      f.httpError = true;
      await p.getByRole("button", { name: "Refresh data" }).click();
      await p.waitForTimeout(100);
      assert.match(await p.locator(".connection").innerText(), /Offline/);
      f.httpError = false;
      f.malformed = true;
      await p.getByRole("button", { name: "Refresh data" }).click();
      await p.waitForTimeout(100);
      assert.match(await p.locator(".connection").innerText(), /Offline/);
      f.malformed = false;
      await p.getByRole("button", { name: "Refresh data" }).click();
      await until(
        async () => /Live/.test(await p.locator(".connection").innerText()),
        "Service recovery not shown",
      );
      await p.close();
    },
  );
  await check(
    "ability rewards bank immediately and the collapsed garage stays accessible",
    async () => {
      const p = await context.newPage();
      await fixtures(p, { state: "IDLE" });
      await seed(p, profile());
      await p.clock.install();
      await p.clock.pauseAt(new Date(Date.now() + 10000));
      await p.goto(url);
      await p
        .getByRole("button", { name: "Start riding", exact: true })
        .click();
      await p.clock.runFor(1250);
      assert.equal(await p.locator(".coin-bank strong").innerText(), "0");
      await p.locator(".weapon-button").first().click();
      assert.equal(await p.locator(".coin-bank strong").innerText(), "5");
      const stored = await p.evaluate(() =>
        JSON.parse(localStorage.getItem("squeekrider-royal-garage-v2")),
      );
      assert.equal(stored.coins, 5);
      await p.clock.resume();
      await p
        .getByRole("button", { name: "Close garage", exact: true })
        .click();
      assert.equal(
        await p
          .getByRole("button", { name: "Open garage", exact: true })
          .getAttribute("aria-expanded"),
        "false",
      );
      await axe(p, "garage-closed");
      await p.getByRole("button", { name: "Open garage", exact: true }).click();
      assert.equal(await p.locator(".coin-bank strong").innerText(), "5");
      await p.close();
    },
  );
  await check(
    "blocked storage keeps play and upgrades usable with a visible persistence warning",
    async () => {
      const p = await context.newPage();
      await fixtures(p);
      await p.addInitScript(() => {
        Storage.prototype.getItem = function () {
          throw new DOMException("blocked", "SecurityError");
        };
        Storage.prototype.setItem = function () {
          throw new DOMException("blocked", "SecurityError");
        };
      });
      await p.goto(url);
      assert.match(
        await p.locator(".garage-note").innerText(),
        /storage is unavailable/,
      );
      await p
        .getByRole("button", { name: "Start riding", exact: true })
        .click();
      assert.equal(await p.locator(".phase-riding").count(), 1);
      await p.close();
    },
  );
  await check(
    "320, 390, 600, 820, 1024 and 1440 layouts, reduced motion and local assets",
    async () => {
      const p = await context.newPage();
      await fixtures(p, { state: "IDLE", settlements: null });
      await p.goto(url);
      for (const width of [320, 390, 600, 820, 1024, 1440]) {
        await p.setViewportSize({ width, height: 900 });
        await p.waitForTimeout(80);
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
          `overflow at ${width}`,
        );
        if (width === 1440) await shot(p, "desktop-ready");
      }
      await p.setViewportSize({ width: 390, height: 844 });
      await p.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await p.evaluate(
          () => getComputedStyle(document.documentElement).scrollBehavior,
        ),
        "auto",
      );
      await shot(p, "mobile-reduced-motion");
      await axe(p, "reduced-motion");
      assert.deepEqual(errors, []);
      assert.deepEqual(localFailures, []);
      await p.close();
    },
  );
  await check(
    "WebKit mobile supports start, movement, specials, pause and modal focus return",
    async () => {
      const b = await pw.webkit.launch({
        headless: true,
        ...(process.env.IMD_WEBKIT_EXECUTABLE
          ? { executablePath: process.env.IMD_WEBKIT_EXECUTABLE }
          : {}),
      });
      browsers.push(b);
      const p = await b.newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      });
      await fixtures(p);
      await p.goto(url);
      await p
        .getByRole("button", { name: "Start riding", exact: true })
        .click();
      await p.keyboard.down("ArrowRight");
      await until(
        async () => /Nitro/.test(await p.locator(".drive-state").innerText()),
        "WebKit nitro HUD did not update",
      );
      await p.keyboard.up("ArrowRight");
      await p.keyboard.press("w");
      await p.keyboard.press("e");
      await p.keyboard.press("q");
      await p.keyboard.press("p");
      assert.equal(await p.locator(".phase-paused").count(), 1);
      await p.getByRole("button", { name: "Resume ride", exact: true }).click();
      await p
        .locator("header")
        .getByRole("button", { name: "How to play", exact: true })
        .click();
      await p.keyboard.press("Escape");
      assert.equal(
        await p.evaluate(() =>
          document.activeElement.getAttribute("aria-label"),
        ),
        "How to play",
      );
      await shot(p, "webkit-mobile");
      await p.close();
    },
  );
  await context.close();
} catch (e) {
  failed = true;
  results.push({ name: "suite", passed: false, error: String(e) });
  console.error(e);
} finally {
  for (const b of browsers) await b.close();
  await new Promise((done) => server.close(done));
  await writeFile(
    `${out}/results.json`,
    JSON.stringify(
      {
        results,
        limitations: [
          "Browser API fixtures exercise spinning, missing, stale, offline and recovery states; they are not live telemetry evidence.",
          "Native screen readers, physical devices, native 200% browser zoom and listening to the sound were not tested.",
        ],
      },
      null,
      2,
    ),
  );
}
process.exitCode = failed ? 1 : 0;
