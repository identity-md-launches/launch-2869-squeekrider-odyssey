import { test } from "node:test";
import assert from "node:assert/strict";
import {
  TRAILS,
  MAX_CHEESE,
  MAX_DISTANCE,
  freshGame,
  jump,
  update,
  playerX,
  parseSaved,
} from "../src/game.ts";

function riding(seed = 12345, width = 1100) {
  const g = freshGame("valley", width, 440, seed);
  g.phase = "riding";
  return g;
}

test("ready and paused rides do not advance or accept jumps", () => {
  for (const phase of ["ready", "paused", "finished"] as const) {
    const g = freshGame("valley");
    g.phase = phase;
    const before = structuredClone(g);
    update(g, 1);
    assert.equal(jump(g), false);
    assert.deepEqual(g, before);
  }
});

test("double jump allows exactly two impulses and resets on landing", () => {
  const g = riding();
  g.nextObstacle = 1000;
  g.nextPickup = 1000;
  assert.equal(jump(g), true);
  assert.equal(g.jumps, 1);
  update(g, 0.04);
  assert.ok(g.playerY < 0);
  assert.equal(jump(g), true);
  assert.equal(g.jumps, 2);
  assert.equal(jump(g), false);
  for (let i = 0; i < 100; i++) update(g, 0.02);
  assert.equal(g.playerY, 0);
  assert.equal(g.jumps, 0);
  assert.equal(g.velocityY, 0);
  assert.equal(jump(g), true);
});

test("distance advances by speed and clamps large frame deltas", () => {
  const a = riding(),
    b = riding();
  update(a, 2);
  update(b, 0.04);
  assert.equal(a.elapsed, 0.04);
  assert.equal(a.distance, b.distance);
  assert.ok(a.distance > 0);
  const before = a.distance;
  update(a, -1);
  assert.equal(a.distance, before);
});

test("all trails eventually collide without jumping at narrow and wide sizes", () => {
  for (const trail of TRAILS)
    for (const width of [380, 480, 1200]) {
      const g = riding(77, width);
      g.trail = trail.id;
      for (let i = 0; i < 1500 && g.phase === "riding"; i++) update(g, 1 / 60);
      assert.equal(g.phase, "finished", `${trail.id} / ${width}`);
      assert.equal(g.lastEvent, "crash");
      assert.ok(g.distance > 30);
    }
});

test("collision boxes allow a high jump over a cactus", () => {
  const g = riding();
  g.playerY = -100;
  g.velocityY = 0;
  g.jumps = 1;
  g.obstacles = [
    { id: 1, x: playerX(g) - 10, width: 30, height: 56, kind: "cactus" },
  ];
  update(g, 0.01);
  assert.equal(g.phase, "riding");
  g.playerY = 0;
  update(g, 0.01);
  assert.equal(g.phase, "finished");
});

test("a cheese pickup counts once and distant cheese stays uncollected", () => {
  const g = riding();
  g.pickups = [
    { id: 1, x: playerX(g), y: -45, taken: false },
    { id: 2, x: playerX(g), y: -190, taken: false },
  ];
  update(g, 0.01);
  assert.equal(g.cheese, 1);
  assert.equal(g.lastEvent, "cheese");
  update(g, 0.01);
  assert.equal(g.cheese, 1);
  assert.equal(g.pickups.length, 1);
  assert.ok(g.particles.length > 0);
});

test("display limits cap long-running counters", () => {
  const g = riding();
  g.distance = MAX_DISTANCE - 0.01;
  g.cheese = MAX_CHEESE;
  g.pickups = [{ id: 1, x: playerX(g), y: -45, taken: false }];
  update(g, 0.04);
  assert.equal(g.distance, MAX_DISTANCE);
  assert.equal(g.cheese, MAX_CHEESE);
});

test("the same seeded input produces the same obstacle and pickup schedule", () => {
  const a = riding(44),
    b = riding(44);
  for (let i = 0; i < 300; i++) {
    if (i % 35 === 0) {
      jump(a);
      jump(b);
    }
    update(a, 0.016);
    update(b, 0.016);
  }
  assert.deepEqual(a, b);
});

test("seeded simulation preserves physics and bounded state over 200 seeds", () => {
  for (let seed = 1; seed <= 200; seed++) {
    const g = riding(seed, 350 + seed * 7);
    g.trail = TRAILS[seed % 3].id;
    for (let frame = 0; frame < 1000 && g.phase === "riding"; frame++) {
      if ((frame + seed) % 29 === 0) jump(g);
      update(g, 0.01 + (seed % 4) * 0.007);
      assert.ok(Number.isFinite(g.playerY));
      assert.ok(g.playerY <= 0);
      assert.ok(g.jumps >= 0 && g.jumps <= 2);
      assert.ok(g.cheese >= 0 && g.distance >= 0);
      assert.ok(g.obstacles.length < 15);
      assert.ok(g.pickups.length < 30);
    }
  }
});

test("invalid, corrupt, and out-of-range storage is discarded safely", () => {
  for (const input of [null, "", "{", "null", "42", "[]", '{"rides":"wrong"}'])
    assert.deepEqual(parseSaved(input), { rides: [], sound: false, best: 0 });
  const good = {
    id: "ride-1",
    trail: "moon",
    distance: 42,
    cheese: 3,
    date: 100000,
  };
  const bad = [
    { ...good, distance: -1 },
    { ...good, trail: "elsewhere" },
    { ...good, cheese: 10000 },
    { ...good, date: 1e17 },
    { ...good, distance: 1.5 },
    { ...good, id: "x".repeat(101) },
  ];
  assert.deepEqual(
    parseSaved(JSON.stringify({ rides: [good, ...bad], sound: true })),
    { rides: [good], sound: true, best: 42 },
  );
  assert.equal(
    parseSaved(JSON.stringify({ rides: Array(30).fill(good) })).rides.length,
    20,
  );
});

test("personal best survives after its ride leaves the 20-entry log", () => {
  assert.equal(
    parseSaved(JSON.stringify({ rides: [], best: 1050 })).best,
    1050,
  );
  assert.equal(parseSaved(JSON.stringify({ rides: [], best: -5 })).best, 0);
});
