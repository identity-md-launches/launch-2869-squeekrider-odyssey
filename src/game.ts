export type TrailId = "valley" | "cactus" | "moon";
export type Phase = "ready" | "riding" | "paused" | "finished";
export type Palette = {
  sky: string;
  sun: string;
  far: string;
  near: string;
  ground: string;
  plant: string;
  ink: string;
};
export type Trail = {
  id: TrailId;
  name: string;
  subtitle: string;
  difficulty: string;
  speed: number;
  gap: number;
  palette: Palette;
};

export const TRAILS: readonly Trail[] = [
  {
    id: "valley",
    name: "Sunbaked valley",
    subtitle: "Golden dunes under a violet sun.",
    difficulty: "Fast",
    speed: 330,
    gap: 1.9,
    palette: {
      sky: "#513c89",
      sun: "#ffcc70",
      far: "#ad72b0",
      near: "#d8908f",
      ground: "#533b72",
      plant: "#71d5bd",
      ink: "#29213f",
    },
  },
  {
    id: "cactus",
    name: "Cactus pass",
    subtitle: "Spiked rails through the cactus frontier.",
    difficulty: "Faster",
    speed: 365,
    gap: 1.65,
    palette: {
      sky: "#2c6878",
      sun: "#ffc46d",
      far: "#69aba3",
      near: "#a8be8e",
      ground: "#354f59",
      plant: "#dbb778",
      ink: "#43513d",
    },
  },
  {
    id: "moon",
    name: "Moonlit mesa",
    subtitle: "Neon skies above the moonlit mesas.",
    difficulty: "Fastest",
    speed: 400,
    gap: 1.5,
    palette: {
      sky: "#24234e",
      sun: "#e9dfaf",
      far: "#5e4e91",
      near: "#9074b2",
      ground: "#3a345d",
      plant: "#68dcca",
      ink: "#293846",
    },
  },
];

export type Obstacle = {
  id: number;
  x: number;
  width: number;
  height: number;
  kind: "rock" | "cactus";
};
export type Pickup = { id: number; x: number; y: number; taken: boolean };
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  color: string;
};
export type Shot = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  hostile: boolean;
  life: number;
};
export type Enemy = {
  id: number;
  x: number;
  y: number;
  hp: number;
  kind: "cart" | "goblin";
  fire: number;
  age: number;
};
export type Boss = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  fire: number;
  age: number;
};
export type Upgrade = "cannon" | "jetpack" | "armor";
export type Levels = Record<Upgrade, number>;
export type Profile = { coins: number; levels: Levels };
export const PROFILE_KEY = "squeekrider-royal-garage-v2";
export const UPGRADE_COST = 40;
export const RANKS = [
  "Wheel Rookie",
  "Seed Slinger",
  "Cheese Knight",
  "Royal Wheel Rider",
  "Supreme Wheel Monarch",
];
export const defaultProfile = (): Profile => ({
  coins: 0,
  levels: { cannon: 1, jetpack: 1, armor: 1 },
});
export const rankLevel = (levels: Levels) =>
  1 + Math.floor((levels.cannon + levels.jetpack + levels.armor - 3) / 3);
export const maxHp = (levels: Levels) => 100 + (levels.armor - 1) * 25;
export const cannonDamage = (levels: Levels) => 10 + (levels.cannon - 1) * 6;
export const maxJumps = (levels: Levels) => levels.jetpack + 1;
export function parseProfile(raw: string | null): Profile {
  try {
    const value = JSON.parse(raw || "null");
    if (
      !value ||
      !Number.isSafeInteger(value.coins) ||
      value.coins < 0 ||
      value.coins > 10000000
    )
      return defaultProfile();
    if (
      !["cannon", "jetpack", "armor"].every(
        (k) =>
          Number.isInteger(value.levels?.[k]) &&
          value.levels[k] >= 1 &&
          value.levels[k] <= 5,
      )
    )
      return defaultProfile();
    return {
      coins: value.coins,
      levels: {
        cannon: value.levels.cannon,
        jetpack: value.levels.jetpack,
        armor: value.levels.armor,
      },
    };
  } catch {
    return defaultProfile();
  }
}
export function buyUpgrade(profile: Profile, kind: Upgrade): Profile | null {
  if (profile.coins < UPGRADE_COST || profile.levels[kind] >= 5) return null;
  return {
    coins: profile.coins - UPGRADE_COST,
    levels: { ...profile.levels, [kind]: profile.levels[kind] + 1 },
  };
}
export type GameState = {
  phase: Phase;
  trail: TrailId;
  width: number;
  height: number;
  distance: number;
  cheese: number;
  elapsed: number;
  playerY: number;
  velocityY: number;
  playerOffset: number;
  jumps: number;
  jumped: number;
  hoverFuel: number;
  hp: number;
  invincible: number;
  levels: Levels;
  turbo: boolean;
  nitro: boolean;
  input: { up: boolean; down: boolean; left: boolean; right: boolean };
  aim: { x: number; y: number } | null;
  nextObstacle: number;
  nextPickup: number;
  nextEnemy: number;
  nextShot: number;
  obstacles: Obstacle[];
  pickups: Pickup[];
  particles: Particle[];
  enemies: Enemy[];
  shots: Shot[];
  boss: Boss | null;
  bossDefeated: boolean;
  bossRush: boolean;
  kills: number;
  bombCooldown: number;
  stormCooldown: number;
  bombFlash: number;
  stormFlash: number;
  sequence: number;
  seed: number;
  lastEvent: SoundEvent | null;
  events: SoundEvent[];
};
export type SoundEvent =
  | "jump"
  | "shoot"
  | "cheese"
  | "upgrade"
  | "explosion"
  | "crash"
  | "lightning";
export type Ride = {
  id: string;
  trail: TrailId;
  distance: number;
  cheese: number;
  date: number;
};
export type Saved = { rides: Ride[]; sound: boolean; best: number };
export const STORAGE_KEY = "squeekrider-odyssey-v1";
export const MAX_DISTANCE = 999999;
export const MAX_CHEESE = 9999;
export function freshGame(
  trail: TrailId,
  width = 1100,
  height = 440,
  seed = 12345,
  levels: Levels = defaultProfile().levels,
): GameState {
  return {
    phase: "ready",
    trail,
    width,
    height,
    distance: 0,
    cheese: 0,
    elapsed: 0,
    playerY: 0,
    velocityY: 0,
    playerOffset: 0,
    jumps: 0,
    jumped: 0,
    hoverFuel: 1,
    hp: maxHp(levels),
    invincible: 0,
    levels: { ...levels },
    turbo: false,
    nitro: false,
    input: { up: false, down: false, left: false, right: false },
    aim: null,
    nextObstacle: 4,
    nextPickup: 0.6,
    nextEnemy: 1.2,
    nextShot: 0.2,
    obstacles: [],
    pickups: [],
    particles: [],
    enemies: [],
    shots: [],
    boss: null,
    bossDefeated: false,
    bossRush: false,
    kills: 0,
    bombCooldown: 0,
    stormCooldown: 0,
    bombFlash: 0,
    stormFlash: 0,
    sequence: 0,
    seed,
    lastEvent: null,
    events: [],
  };
}
export const playerX = (g: GameState) =>
  Math.min(265, Math.max(95, g.width * 0.23)) + g.playerOffset;
export const groundY = (g: GameState) => g.height * 0.84;
export const trailFor = (id: TrailId) => TRAILS.find((t) => t.id === id)!;
export const bikeSpeed = (g: GameState) =>
  (trailFor(g.trail).speed + Math.min(g.elapsed * 0.7, 80)) *
  (g.turbo ? 1.35 : 1) *
  (g.input.right ? 1.55 : 1);
function random(g: GameState) {
  g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
  return g.seed / 4294967296;
}
function event(g: GameState, kind: SoundEvent) {
  g.lastEvent = kind;
  if (g.events.length < 20) g.events.push(kind);
}
function burst(g: GameState, x: number, y: number, color: string, count = 12) {
  for (let i = 0; i < count; i++)
    g.particles.push({
      x,
      y: groundY(g) + y,
      vx: (random(g) - 0.5) * 260,
      vy: (random(g) - 0.7) * 230,
      age: 0,
      life: 0.5 + random(g) * 0.3,
      color,
    });
}
export function jump(g: GameState): boolean {
  if (g.phase !== "riding" || g.jumps >= maxJumps(g.levels)) return false;
  g.velocityY = -420 - g.levels.jetpack * 25;
  g.jumps++;
  g.jumped++;
  event(g, "jump");
  return true;
}
export function clearInput(g: GameState) {
  g.input = { up: false, down: false, left: false, right: false };
  g.nitro = false;
}
export function fire(g: GameState): boolean {
  if (g.phase !== "riding") return false;
  const x = playerX(g) + 38,
    y = g.playerY - 55;
  const angle = g.aim ? Math.atan2(g.aim.y - y, g.aim.x - x) : -0.04;
  for (const spread of g.turbo ? [-0.19, 0, 0.19] : [0])
    g.shots.push({
      x,
      y,
      vx: Math.cos(angle + spread) * 900,
      vy: Math.sin(angle + spread) * 900,
      damage: cannonDamage(g.levels),
      hostile: false,
      life: 1.7,
    });
  event(g, "shoot");
  return true;
}
export function summonBoss(g: GameState) {
  if (g.boss || g.bossDefeated || g.phase !== "riding") return false;
  g.boss = {
    x: g.width - 120,
    y: -170,
    hp: 420,
    maxHp: 420,
    fire: 1.1,
    age: 0,
  };
  g.obstacles = [];
  g.enemies = [];
  g.shots = g.shots.filter((s) => !s.hostile);
  return true;
}
function reward(g: GameState, amount: number) {
  g.cheese = Math.min(MAX_CHEESE, g.cheese + amount);
  event(g, "cheese");
}
function defeatBoss(g: GameState) {
  if (!g.boss || g.boss.hp > 0) return;
  burst(g, g.boss.x, g.boss.y, "#ffd36a", 48);
  g.boss.hp = 0;
  g.bossDefeated = true;
  g.phase = "finished";
  reward(g, 60);
  event(g, "explosion");
  clearInput(g);
}
function defeatEnemy(g: GameState, e: Enemy) {
  burst(g, e.x, e.y, e.kind === "cart" ? "#ffab6b" : "#69e2ce");
  g.kills++;
  reward(g, 5);
  event(g, "explosion");
}
export function special(g: GameState, kind: "bomb" | "storm"): boolean {
  if (
    g.phase !== "riding" ||
    (kind === "bomb" ? g.bombCooldown : g.stormCooldown) > 0
  )
    return false;
  if (kind === "bomb") {
    g.bombCooldown = 8;
    g.bombFlash = 0.55;
  } else {
    g.stormCooldown = 12;
    g.stormFlash = 0.65;
  }
  for (const e of g.enemies) {
    e.hp = 0;
    defeatEnemy(g, e);
  }
  g.enemies = [];
  g.obstacles = [];
  g.shots = g.shots.filter((s) => !s.hostile);
  if (g.boss) {
    g.boss.hp -= kind === "bomb" ? 65 : 85;
    defeatBoss(g);
  }
  event(g, kind === "bomb" ? "explosion" : "lightning");
  return true;
}
function hurt(g: GameState) {
  if (g.invincible > 0) return;
  g.hp = Math.max(0, g.hp - 25);
  g.invincible = 1.2;
  burst(g, playerX(g), g.playerY - 50, "#ff8b9a");
  event(g, "crash");
  if (g.hp === 0) {
    g.phase = "finished";
    clearInput(g);
  }
}
export function update(g: GameState, delta: number) {
  if (g.phase !== "riding") return;
  const dt = Math.min(Math.max(Number.isFinite(delta) ? delta : 0, 0), 0.04);
  if (dt === 0) return;
  const speed = bikeSpeed(g),
    ground = groundY(g);
  g.lastEvent = null;
  g.elapsed += dt;
  g.distance = Math.min(MAX_DISTANCE, g.distance + (speed * dt) / 12);
  g.nitro = g.input.right;
  for (const k of [
    "invincible",
    "bombCooldown",
    "stormCooldown",
    "bombFlash",
    "stormFlash",
  ] as const)
    g[k] = Math.max(0, g[k] - dt);
  const shift = (g.input.right ? 1 : 0) - (g.input.left ? 1 : 0);
  g.playerOffset += shift * (180 + g.levels.jetpack * 20) * dt;
  const base = Math.min(265, Math.max(95, g.width * 0.23));
  g.playerOffset = Math.max(
    50 - base,
    Math.min(g.width * 0.62 - base, g.playerOffset),
  );
  g.velocityY += (g.input.down ? 2400 : 1100) * dt;
  if (g.input.down) g.velocityY = Math.max(430, g.velocityY);
  else if (g.input.up && g.playerY < -8 && g.hoverFuel > 0) {
    g.velocityY -= (1280 + g.levels.jetpack * 45) * dt;
    g.velocityY = Math.max(-160 - g.levels.jetpack * 20, g.velocityY);
    g.hoverFuel = Math.max(
      0,
      g.hoverFuel - dt / (1.7 + g.levels.jetpack * 0.3),
    );
  }
  g.playerY += g.velocityY * dt;
  if (g.playerY < -ground + 115) {
    g.playerY = -ground + 115;
    g.velocityY = Math.max(0, g.velocityY);
  }
  if (g.playerY >= 0) {
    g.playerY = 0;
    g.velocityY = 0;
    g.jumps = 0;
    g.hoverFuel = Math.min(1, g.hoverFuel + dt * 1.5);
  }
  g.nextShot -= dt;
  if (g.nextShot <= 0) {
    fire(g);
    g.nextShot = 0.22;
  }
  if (g.distance >= 600 && !g.boss && !g.bossDefeated) summonBoss(g);
  g.nextEnemy -= dt;
  g.nextObstacle -= dt;
  g.nextPickup -= dt;
  if (g.nextEnemy <= 0) {
    const kind = random(g) > 0.5 ? "goblin" : "cart";
    g.enemies.push({
      id: g.sequence++,
      x: g.width + 50,
      y: kind === "cart" ? -28 : -110 - random(g) * 110,
      hp: kind === "cart" ? 25 : 20,
      kind,
      fire: 1 + random(g),
      age: 0,
    });
    g.nextEnemy = g.boss ? 3.5 : 1.25 + random(g) * 0.9;
  }
  if (g.nextObstacle <= 0 && !g.boss) {
    const kind = random(g) > 0.5 ? "cactus" : "rock";
    g.obstacles.push({
      id: g.sequence++,
      x: g.width + 50,
      width: 30,
      height: kind === "cactus" ? 46 : 30,
      kind,
    });
    g.nextObstacle = 3.2 + random(g) * 2;
  }
  if (g.nextPickup <= 0) {
    const y = random(g) > 0.45 ? -55 : -145;
    for (let i = 0; i < 6; i++)
      g.pickups.push({
        id: g.sequence++,
        x: g.width + 50 + i * 35,
        y: y - Math.sin((i / 5) * Math.PI) * 20,
        taken: false,
      });
    g.nextPickup = 1.6;
  }
  const px = playerX(g),
    py = g.playerY - 48;
  for (const e of g.enemies) {
    e.x -= (speed + (e.kind === "cart" ? 35 : -65)) * dt;
    e.age += dt;
    e.fire -= dt;
    if (e.kind === "goblin" && e.fire <= 0 && e.x < g.width && e.x > px) {
      const a = Math.atan2(py - e.y, px - e.x);
      g.shots.push({
        x: e.x,
        y: e.y,
        vx: Math.cos(a) * 255,
        vy: Math.sin(a) * 255,
        damage: 25,
        hostile: true,
        life: 4,
      });
      e.fire = 1.8;
    }
    if (Math.abs(e.x - px) < 42 && Math.abs(e.y - py) < 43) {
      hurt(g);
      e.hp = 0;
    }
  }
  for (const o of g.obstacles) {
    o.x -= speed * dt;
    if (o.x < px + 23 && o.x + o.width > px - 23 && g.playerY > -o.height + 9) {
      hurt(g);
      o.x = -100;
    }
  }
  if (g.boss) {
    const b = g.boss;
    b.age += dt;
    b.y = -190 + Math.sin(b.age * 1.5) * 62;
    b.x = g.width - 108 + Math.sin(b.age * 0.7) * 12;
    b.fire -= dt;
    if (b.fire <= 0) {
      const a = Math.atan2(py - b.y, px - b.x);
      for (const spread of [-0.17, 0, 0.17])
        g.shots.push({
          x: b.x - 75,
          y: b.y + 10,
          vx: Math.cos(a + spread) * 230,
          vy: Math.sin(a + spread) * 230,
          damage: 25,
          hostile: true,
          life: 5,
        });
      b.fire = b.hp < b.maxHp / 2 ? 0.9 : 1.3;
    }
    if (Math.abs(px - b.x) < 95 && Math.abs(py - b.y) < 55) hurt(g);
  }
  for (const s of g.shots) {
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    if (s.hostile) {
      if (Math.abs(s.x - px) < 23 && Math.abs(s.y - py) < 30) {
        hurt(g);
        s.life = 0;
      }
    } else {
      for (const e of g.enemies)
        if (
          e.hp > 0 &&
          Math.abs(s.x - e.x) < 32 &&
          Math.abs(s.y - e.y) < 31 &&
          s.life > 0
        ) {
          e.hp -= s.damage;
          s.life = 0;
          burst(g, s.x, s.y, "#ffdd77", 3);
          if (e.hp <= 0) defeatEnemy(g, e);
        }
      if (
        g.boss &&
        s.life > 0 &&
        Math.abs(s.x - g.boss.x) < 84 &&
        Math.abs(s.y - g.boss.y) < 49
      ) {
        g.boss.hp -= s.damage;
        s.life = 0;
        burst(g, s.x, s.y, "#ffdd77", 3);
      }
    }
  }
  for (const p of g.pickups) {
    p.x -= speed * dt;
    if (!p.taken && Math.abs(p.x - px) < 35 && Math.abs(p.y - py) < 43) {
      p.taken = true;
      reward(g, 1);
      burst(g, p.x, p.y, "#ffd36a", 6);
    }
  }
  for (const p of g.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 250 * dt;
  }
  g.obstacles = g.obstacles.filter((o) => o.x > -80);
  g.enemies = g.enemies.filter((e) => e.x > -80 && e.hp > 0);
  g.pickups = g.pickups.filter((p) => p.x > -50 && !p.taken);
  g.shots = g.shots.filter(
    (s) =>
      s.life > 0 &&
      s.x > -80 &&
      s.x < g.width + 80 &&
      s.y > -ground &&
      s.y < 80,
  );
  g.particles = g.particles.filter((p) => p.age < p.life).slice(-200);
  defeatBoss(g);
}

export function parseSaved(raw: string | null): Saved {
  const fallback: Saved = { rides: [], sound: false, best: 0 };
  if (!raw) return fallback;
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return fallback;
    const value = data as Record<string, unknown>;
    const rides = Array.isArray(value.rides)
      ? value.rides
          .filter((r: unknown): r is Ride => {
            if (!r || typeof r !== "object") return false;
            const a = r as Record<string, unknown>;
            return (
              typeof a.id === "string" &&
              a.id.length < 100 &&
              TRAILS.some((t) => t.id === a.trail) &&
              typeof a.distance === "number" &&
              Number.isInteger(a.distance) &&
              a.distance >= 0 &&
              a.distance <= MAX_DISTANCE &&
              typeof a.cheese === "number" &&
              Number.isInteger(a.cheese) &&
              a.cheese >= 0 &&
              a.cheese <= MAX_CHEESE &&
              typeof a.date === "number" &&
              Number.isFinite(a.date) &&
              a.date > 0 &&
              a.date <= 8640000000000000
            );
          })
          .slice(0, 20)
      : [];
    const recordedBest = rides.reduce(
      (n, ride) => Math.max(n, ride.distance),
      0,
    );
    const storedBest =
      typeof value.best === "number" &&
      Number.isInteger(value.best) &&
      value.best >= 0 &&
      value.best <= MAX_DISTANCE
        ? value.best
        : 0;
    return {
      rides,
      sound: value.sound === true,
      best: Math.max(recordedBest, storedBest),
    };
  } catch {
    return fallback;
  }
}
