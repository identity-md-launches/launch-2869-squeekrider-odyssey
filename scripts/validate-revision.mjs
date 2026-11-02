// Focused production regressions for the reopened review. No game state is exposed or altered.
// --baseline inspects the previously accepted export kept under test/scratch/revision/.
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const pw = await import(process.env.IMD_PLAYWRIGHT
  ? pathToFileURL(process.env.IMD_PLAYWRIGHT).href : "playwright");
const baseline = process.argv.includes("--baseline");
const root = resolve(baseline ? "test/scratch/revision/baseline-dist" : "dist");
const out = resolve(`test/scratch/revision/${baseline ? "before" : "after"}`);
await mkdir(out, { recursive: true });
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
  if (!pathname.startsWith("/preview/")) return res.writeHead(404).end();
  const file = resolve(root, pathname.slice(9) || "index.html");
  if (!file.startsWith(root + sep)) return res.writeHead(403).end();
  try { res.setHeader("content-type", mime[extname(file)] || "application/octet-stream"); res.end(await readFile(file)); }
  catch { res.writeHead(404).end(); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const url = `http://127.0.0.1:${server.address().port}/preview/`;
const results = [], limitations = [], errors = [], failures = [], external = [];
let browser;
const check = async (engine, name, fn) => {
  try { results.push({ engine, name, passed: true, observations: await fn() }); }
  catch (e) { results.push({ engine, name, passed: false, error: String(e) }); process.exitCode = 1; }
};
const expect = (fixed, message) => assert.equal(fixed, !baseline, message);
const seed = {
  rides: [{ id: "review-test", trail: "valley", distance: 21, cheese: 1, date: Date.UTC(2026, 10, 2) }],
  best: 1000, sound: false,
};
const pixels = (page) => page.locator("canvas").evaluate((canvas) => {
  const ctx = canvas.getContext("2d");
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let opaque = 0;
  const colors = new Set();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]) opaque++;
    colors.add(`${data[i]},${data[i+1]},${data[i+2]},${data[i+3]}`);
  }
  return { width: canvas.width, height: canvas.height, firstPixel: Array.from(data.slice(0, 4)), opaque, colors: colors.size, pngLength: canvas.toDataURL().length };
});
const phase = (page) => page.locator(".game-shell").getAttribute("class");
const distance = (page) => page.locator(".distance strong").innerText();
const shot = (page, name) => page.screenshot({ path: `${out}/${name}.png` });
const button = (page, name) => page.getByRole("button", { name, exact: true });
const instrument = () => {
  window.__riderSamples = [];
  const translate = CanvasRenderingContext2D.prototype.translate;
  CanvasRenderingContext2D.prototype.translate = function(x, y) {
    if (this.canvas.matches(".game-stage canvas")) {
      const rect = this.canvas.getBoundingClientRect();
      const px = Math.min(265, Math.max(95, rect.width / rect.height * 440 * 0.23));
      if (Math.abs(x - px) < 0.001 && y > 50) {
        window.__riderY = y;
        window.__riderSamples.push(y);
        if (window.__riderSamples.length > 1000) window.__riderSamples.shift();
      }
    }
    return translate.call(this, x, y);
  };
};
try {
  for (const engine of ["chromium", "webkit"]) {
    try { browser = await pw[engine].launch({ headless: true }); }
    catch(e) { limitations.push(`${engine} could not launch: ${String(e)}`); process.exitCode = 1; continue; }
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    context.on("page", (p) => {
      p.on("pageerror", (e) => errors.push(`${engine}: ${e.message}`));
      p.on("response", (r) => { if (r.status() >= 400) failures.push(`${engine}: ${r.status()} ${r.url()}`); });
    });
    await context.route("**/*", (route) => {
      if (route.request().url().startsWith(new URL(url).origin)) return route.continue();
      external.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    // No pointer, key, focus, or click before this observation and screenshot.
    await check(engine, "fresh mobile canvas before interaction", async () => {
      await page.goto(url);
      await page.waitForTimeout(1500);
      const result = await pixels(page);
      const start = await button(page, "Start riding").boundingBox();
      await shot(page, `${engine}-390-ready`);
      assert.ok(start && start.y + start.height < 844);
      if (!baseline || engine === "webkit") expect(result.opaque > 0 && result.colors > 100, JSON.stringify(result));
      return result;
    });
    await check(engine, "clear modal freezes an active ride, cancel and confirm keep it paused", async () => {
      await page.evaluate((data) => localStorage.setItem("squeekrider-odyssey-v1", JSON.stringify(data)), seed);
      await page.reload();
      await button(page, "Start riding").click();
      await page.waitForFunction(() => Number(document.querySelector(".distance strong").textContent) > 3);
      await button(page, "Clear ride log").click();
      const before = { phase: await phase(page), distance: await distance(page) };
      await page.waitForTimeout(900);
      const after = { phase: await phase(page), distance: await distance(page) };
      assert.equal(await page.locator("dialog").evaluate((d) => d.open), true);
      if (!baseline) {
        assert.match(before.phase, /phase-paused/);
        assert.deepEqual(after, before);
        assert.equal(await page.evaluate(() => document.querySelector("dialog").contains(document.activeElement)), true);
      } else {
        assert.match(before.phase, /phase-riding/);
        if (engine === "chromium") assert.notEqual(after.distance, before.distance);
      }
      await shot(page, `${engine}-clear-dialog`);
      await button(page, "Keep my rides").click();
      assert.equal(await page.locator("#ride-log tbody tr").count(), 1);
      if (!baseline) {
        assert.match(await phase(page), /phase-paused/);
        assert.equal(await button(page, "Clear ride log").evaluate((el) => el === document.activeElement), true);
        await button(page, "Resume ride").click();
        await button(page, "Clear ride log").click();
        await page.getByRole("dialog").getByRole("button", {name: "Clear ride log", exact: true}).click();
        assert.match(await phase(page), /phase-paused/);
        assert.equal(await page.locator("#ride-log tbody tr").count(), 0);
        assert.match(await page.locator(".personal-best").textContent(), /0/);
        await button(page, "Resume ride").click();
        await page.locator(".phase-riding").waitFor();
      }
      return { before, after };
    });
    await check(engine, "all-time best visible with its unit at every breakpoint", async () => {
      await page.evaluate((data) => localStorage.setItem("squeekrider-odyssey-v1", JSON.stringify(data)), seed);
      const observations = [];
      for (const width of [320, 390, 600, 820, 821, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        await page.reload();
        await page.evaluate(() => document.fonts.ready);
        const result = await page.locator(".personal-best").evaluate((el) => {
          const r = el.getBoundingClientRect();
          return { text: el.innerText, display: getComputedStyle(el).display, visible: el.checkVisibility(), box: { x: r.x, y: r.y, width: r.width, height: r.height } };
        });
        assert.equal(result.visible, !baseline || width > 820, `best visibility at ${width}`);
        if (!baseline) {
          assert.match(result.text, /1,000 m/);
          assert.ok(result.box.x >= 0 && result.box.x + result.box.width <= width);
          assert.ok(result.box.y + result.box.height < 844);
          assert.ok(await button(page, "Start riding").boundingBox().then((r) => r.y + r.height < 844));
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        observations.push({ width, ...result });
      }
      return observations;
    });
    await check(engine, "one headline and plain game explanation on the first phone screen", async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(url);
      const copy = await page.locator(".ride-section").innerText();
      const h1 = await page.locator("h1").innerText();
      const extras = await page.locator(".intro-note, .scene-signature").allTextContents();
      if (baseline) {
        assert.equal(extras.length, 2);
        assert.ok(copy.includes("Made for a moment away."));
        assert.ok(!(await page.locator(".intro p").innerText()).includes("game"));
      } else {
        assert.equal(h1, "One mouse. Two wheels.");
        assert.equal(await page.locator(".intro p").innerText(), "A free browser game across three endless desert trails.");
        assert.deepEqual(extras, []);
        assert.ok(!copy.includes("Made for a moment away."));
        assert.match(await page.locator(".game-footnote").innerText(), /Free to play./);
        assert.match(copy, /Records stay in this browser./);
      }
      await shot(page, `${engine}-390-best`);
      return { h1, extraLines: extras, footnote: await page.locator(".game-footnote").innerText() };
    });
    await context.close();
    await check(engine, "ArrowUp and W jump after the Jump button receives focus", async () => {
      const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
      await desktop.addInitScript(instrument);
      const p = await desktop.newPage();
      const observations = [];
      try {
        for (const key of ["ArrowUp", "w"]) {
          await p.goto(url);
          await button(p, "Start riding").click();
          await p.keyboard.press(key);
          await p.waitForFunction(() => window.__riderY < 340);
          const canvasJump = await p.evaluate(() => window.__riderY);
          assert.ok(canvasJump < 340, `control jump did not render: ${canvasJump}`);
          await p.waitForFunction(() => window.__riderY > 346);
          await button(p, "Jump").click();
          await p.waitForFunction(() => window.__riderY < 340);
          await p.waitForFunction(() => window.__riderY > 346);
          await p.evaluate(() => { window.__riderSamples = []; });
          await p.keyboard.press(key);
          await p.waitForTimeout(350);
          const result = await p.evaluate(() => ({ focused: document.activeElement.textContent.trim(), samples: window.__riderSamples }));
          assert.equal(result.focused, "Jump");
          assert.ok(result.samples.length > 0);
          expect(Math.min(...result.samples) < 340, `${key}: ${JSON.stringify(result)}`);
          observations.push({ key, canvasJump, focused: result.focused, minY: Math.min(...result.samples) });
        }
      } finally { await desktop.close(); }
      return observations;
    });
    await check(engine, "canvas paints and repaints when animation callbacks are withheld", async () => {
      const deferred = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      await deferred.addInitScript(() => { window.requestAnimationFrame = () => 1; window.cancelAnimationFrame = () => {}; });
      const p = await deferred.newPage();
      try {
        await p.goto(url);
        await p.waitForTimeout(200);
        const initial = await pixels(p);
        expect(initial.opaque > 0, JSON.stringify(initial));
        await p.locator(".game-stage").evaluate((el) => { el.style.width = `${el.clientWidth - 10}px`; });
        await p.waitForTimeout(200);
        const resized = await pixels(p);
        if (!baseline) assert.notEqual(resized.width, initial.width);
        expect(resized.opaque > 0, JSON.stringify(resized));
        return { initial, resized };
      } finally { await deferred.close(); }
    });
    await browser.close();
    browser = null;
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  assert.deepEqual(external, []);
} catch(e) { console.error(e); process.exitCode = 1; }
finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
  const report = { mode: baseline ? "baseline (assert reported defects)" : "fixed (assert correct behavior)", results, limitations, errors, failures, external };
  await writeFile(`${out}/results.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
}
