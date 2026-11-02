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
  fire,
  special,
  summonBoss,
  bikeSpeed,
  buyUpgrade,
  parseProfile,
  defaultProfile,
  rankLevel,
  maxHp,
  maxJumps,
  clearInput,
  type GameState,
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
  assert.equal(g.phase, "riding");
  assert.equal(g.hp, 75);
  assert.ok(g.invincible > 0);
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

function quiet(g: GameState) {
  g.nextEnemy = 1000;
  g.nextObstacle = 1000;
  g.nextPickup = 1000;
}
test("four-direction control applies nitro, retreat, hover and fast dive", () => {
  const base = riding();
  quiet(base);
  const boosted = structuredClone(base);
  boosted.input.right = true;
  assert.ok(Math.abs(bikeSpeed(boosted) / bikeSpeed(base) - 1.55) < 1e-9);
  update(base, 0.04);
  update(boosted, 0.04);
  assert.ok(boosted.distance > base.distance);
  assert.ok(playerX(boosted) > playerX(base));
  boosted.input.right = false;
  boosted.input.left = true;
  const previous = playerX(boosted);
  update(boosted, 0.04);
  assert.ok(playerX(boosted) < previous);
  jump(base);
  base.input.up = true;
  for (let i = 0; i < 20; i++) update(base, 0.02);
  assert.ok(base.playerY < -40);
  assert.ok(base.hoverFuel < 1);
  base.input.up = false;
  base.input.down = true;
  update(base, 0.04);
  assert.ok(base.velocityY >= 430);
  for (let i = 0; i < 40; i++) update(base, 0.02);
  assert.equal(base.playerY, 0);
  assert.equal(base.jumps, 0);
  clearInput(boosted);
  assert.ok(Object.values(boosted.input).every((v) => v === false));
});
test("turbo stacks with nitro and fires a real three-way spread", () => {
  const g = riding();
  quiet(g);
  const normal = bikeSpeed(g);
  g.turbo = true;
  assert.ok(Math.abs(bikeSpeed(g) / normal - 1.35) < 1e-9);
  g.input.right = true;
  assert.ok(Math.abs(bikeSpeed(g) / normal - 1.35 * 1.55) < 1e-9);
  assert.equal(fire(g), true);
  assert.equal(g.shots.length, 3);
  assert.equal(new Set(g.shots.map((s) => s.vy)).size, 3);
  g.shots = [];
  g.turbo = false;
  g.aim = { x: playerX(g) + 50, y: -200 };
  fire(g);
  assert.equal(g.shots.length, 1);
  assert.ok(g.shots[0].vy < 0);
});
test("automatic cannon hits enemies and awards exactly five coins", () => {
  const g = riding();
  quiet(g);
  g.enemies = [
    {
      id: 1,
      x: playerX(g) + 150,
      y: -55,
      hp: 10,
      kind: "goblin",
      fire: 100,
      age: 0,
    },
  ];
  for (let i = 0; i < 20; i++) update(g, 0.02);
  assert.equal(g.kills, 1);
  assert.equal(g.cheese, 5);
  assert.equal(g.enemies.length, 0);
});
test("enemy shots damage armor once inside the invulnerability window", () => {
  const g = riding();
  quiet(g);
  g.shots = [
    { x: playerX(g), y: -48, vx: 0, vy: 0, hostile: true, damage: 25, life: 1 },
  ];
  update(g, 0.01);
  assert.equal(g.hp, 75);
  g.shots = [
    { x: playerX(g), y: -48, vx: 0, vy: 0, hostile: true, damage: 25, life: 1 },
  ];
  update(g, 0.01);
  assert.equal(g.hp, 75);
  g.invincible = 0;
  g.hp = 25;
  g.shots = [
    { x: playerX(g), y: -48, vx: 0, vy: 0, hostile: true, damage: 25, life: 1 },
  ];
  update(g, 0.01);
  assert.equal(g.hp, 0);
  assert.equal(g.phase, "finished");
});
test("both special weapons clear hazards, damage bosses and enforce cooldowns", () => {
  const g = riding();
  quiet(g);
  summonBoss(g);
  g.enemies = [
    { id: 1, x: 300, y: -30, hp: 25, kind: "cart", fire: 100, age: 0 },
  ];
  g.shots = [
    { x: 300, y: -50, vx: -100, vy: 0, hostile: true, damage: 25, life: 2 },
  ];
  assert.equal(special(g, "bomb"), true);
  assert.equal(g.boss!.hp, 355);
  assert.equal(g.cheese, 5);
  assert.equal(g.enemies.length, 0);
  assert.equal(g.shots.length, 0);
  assert.equal(g.bombCooldown, 8);
  assert.equal(special(g, "bomb"), false);
  assert.equal(special(g, "storm"), true);
  assert.equal(g.boss!.hp, 270);
  assert.equal(g.stormCooldown, 12);
  for (let i = 0; i < 400 && g.phase === "riding"; i++) {
    g.shots = [];
    g.enemies = [];
    g.invincible = 1;
    update(g, 0.04);
  }
  assert.equal(g.bombCooldown, 0);
  assert.equal(g.stormCooldown, 0);
});
test("boss starts at 600m or immediately in rush and victory rewards 60 once", () => {
  const g = riding();
  quiet(g);
  g.distance = 599.9;
  update(g, 0.04);
  assert.ok(g.boss);
  assert.equal(g.boss!.hp, 420);
  const rush = riding();
  quiet(rush);
  assert.equal(summonBoss(rush), true);
  assert.equal(rush.distance, 0);
  assert.equal(summonBoss(rush), false);
  rush.boss!.hp = 50;
  special(rush, "bomb");
  assert.equal(rush.phase, "finished");
  assert.equal(rush.bossDefeated, true);
  assert.equal(rush.cheese, 60);
  update(rush, 0.04);
  assert.equal(rush.cheese, 60);
});
test("garage charges 40 per level, caps each at five and reaches Supreme Wheel Monarch", () => {
  let profile = defaultProfile();
  assert.equal(buyUpgrade(profile, "cannon"), null);
  profile.coins = 480;
  for (const kind of ["cannon", "jetpack", "armor"] as const)
    for (let i = 0; i < 4; i++) {
      const next = buyUpgrade(profile, kind);
      assert.ok(next);
      assert.equal(profile.coins - next.coins, 40);
      profile = next;
    }
  assert.equal(profile.coins, 0);
  assert.equal(rankLevel(profile.levels), 5);
  assert.equal(maxHp(profile.levels), 200);
  assert.equal(maxJumps(profile.levels), 6);
  assert.equal(buyUpgrade({ ...profile, coins: 40 }, "armor"), null);
  const g = freshGame("valley", 1100, 440, 10, profile.levels);
  g.phase = "riding";
  assert.equal(g.hp, 200);
  for (let i = 0; i < 6; i++) assert.equal(jump(g), true);
  assert.equal(jump(g), false);
});
test("garage persistence rejects corrupt, negative, fractional and oversized values", () => {
  for (const raw of [
    null,
    "{",
    '"text"',
    JSON.stringify({ coins: -1, levels: { cannon: 1, jetpack: 1, armor: 1 } }),
    JSON.stringify({ coins: 1, levels: { cannon: 6, jetpack: 1, armor: 1 } }),
  ])
    assert.deepEqual(parseProfile(raw), defaultProfile());
  const value = { coins: 80, levels: { cannon: 3, jetpack: 2, armor: 1 } };
  assert.deepEqual(parseProfile(JSON.stringify(value)), value);
});

import {
  parseStatus,
  parseEconomy,
  integerValue,
  wheelFresh,
  turboAvailable,
  watchTelemetry,
} from "../src/telemetry.ts";
const wheelPayload = () => ({
  measurement: {
    coreStatus: "SPINNING",
    rpmMilli: 125000,
    observedAt: new Date().toISOString(),
    staleAfterSeconds: 120,
    freshness: "online",
  },
  builder: { anchor: { blockHeight: "12345678901234567890" } },
});
test("telemetry preserves real values and never derives missing settlements", () => {
  const data = parseStatus(wheelPayload());
  assert.equal(data.rpmMilli, 125000);
  assert.equal(data.blockHeight, "12345678901234567890");
  assert.equal(integerValue(9007199254740992), null);
  assert.equal(
    parseEconomy({ schemaVersion: 2, mining: { fundedBlocks: "6808" } })
      .totalSettlements,
    null,
  );
  assert.equal(
    parseEconomy({ totalSettlements: "992" }).totalSettlements,
    "992",
  );
  assert.throws(() => parseStatus({}));
  assert.throws(() => parseEconomy(null));
});
test("only fresh, online, spinning telemetry can power turbo", () => {
  const now = Date.now(),
    feed = {
      data: parseStatus(wheelPayload()),
      receivedAt: now,
      error: null,
      loading: false,
    };
  assert.equal(turboAvailable(feed, now), true);
  assert.equal(
    turboAvailable(
      { ...feed, data: { ...feed.data, coreStatus: "IDLE", rpmMilli: 0 } },
      now,
    ),
    false,
  );
  assert.equal(turboAvailable({ ...feed, error: "offline" }, now), false);
  assert.equal(wheelFresh(feed, now + 35001), false);
  assert.equal(
    wheelFresh(
      { ...feed, data: { ...feed.data, observedAt: now - 121000 } },
      now,
    ),
    false,
  );
});
test("both telemetry endpoints poll, fail independently, retain last-known data and recover", async () => {
  const calls: string[] = [];
  let fail = false;
  const fetcher = (async (url: RequestInfo | URL) => {
    calls.push(String(url));
    if (fail && String(url).endsWith("/status"))
      throw new Error("network failure");
    return new Response(
      JSON.stringify(
        String(url).endsWith("/status")
          ? wheelPayload()
          : { totalSettlements: "42" },
      ),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;
  const states: Parameters<Parameters<typeof watchTelemetry>[0]>[0][] = [];
  const watcher = watchTelemetry((s) => states.push(s), fetcher, 20);
  try {
    await new Promise((r) => setTimeout(r, 15));
    assert.ok(states.at(-1)!.status.data);
    assert.equal(states.at(-1)!.economy.data!.totalSettlements, "42");
    fail = true;
    await new Promise((r) => setTimeout(r, 35));
    assert.ok(states.at(-1)!.status.error);
    assert.equal(states.at(-1)!.status.data!.rpmMilli, 125000);
    assert.equal(states.at(-1)!.economy.error, null);
    fail = false;
    await new Promise((r) => setTimeout(r, 35));
    assert.equal(states.at(-1)!.status.error, null);
    assert.ok(calls.filter((u) => u.endsWith("/status")).length >= 3);
    assert.ok(calls.filter((u) => u.endsWith("/economy/state")).length >= 3);
  } finally {
    watcher.stop();
  }
  const stopped = calls.length;
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(calls.length, stopped);
});
