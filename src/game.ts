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
    subtitle: "An easy ride under warm skies.",
    difficulty: "Easygoing",
    speed: 205,
    gap: 1.9,
    palette: {
      sky: "#e5eee6",
      sun: "#eda66b",
      far: "#e7c2a0",
      near: "#cb8e6a",
      ground: "#edcf9e",
      plant: "#718b72",
      ink: "#455448",
    },
  },
  {
    id: "cactus",
    name: "Cactus pass",
    subtitle: "A few more prickly neighbors.",
    difficulty: "A little lively",
    speed: 245,
    gap: 1.65,
    palette: {
      sky: "#e9edcf",
      sun: "#edb862",
      far: "#d8c395",
      near: "#ba9c70",
      ground: "#e5cea2",
      plant: "#657c55",
      ink: "#43513d",
    },
  },
  {
    id: "moon",
    name: "Moonlit mesa",
    subtitle: "Follow the stars a little further.",
    difficulty: "Feeling brave",
    speed: 280,
    gap: 1.5,
    palette: {
      sky: "#313f50",
      sun: "#e9dfaf",
      far: "#676f87",
      near: "#8a7f94",
      ground: "#c0adb5",
      plant: "#5f777c",
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
  jumps: number;
  nextObstacle: number;
  nextPickup: number;
  obstacles: Obstacle[];
  pickups: Pickup[];
  particles: Particle[];
  sequence: number;
  seed: number;
  jumped: number;
  lastEvent: "jump" | "cheese" | "crash" | null;
};
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
    jumps: 0,
    nextObstacle: 2.5,
    nextPickup: 1.3,
    obstacles: [],
    pickups: [],
    particles: [],
    sequence: 0,
    seed,
    jumped: 0,
    lastEvent: null,
  };
}

export const playerX = (g: GameState) =>
  Math.min(265, Math.max(95, g.width * 0.23));
export const groundY = (g: GameState) => g.height * 0.79;
export const trailFor = (id: TrailId) => TRAILS.find((t) => t.id === id)!;

function random(g: GameState) {
  g.seed = (Math.imul(g.seed, 1664525) + 1013904223) >>> 0;
  return g.seed / 4294967296;
}

export function jump(g: GameState): boolean {
  if (g.phase !== "riding" || g.jumps >= 2) return false;
  g.velocityY = g.jumps === 0 ? -515 : -455;
  g.jumps++;
  g.jumped++;
  g.lastEvent = "jump";
  return true;
}

export function update(g: GameState, delta: number) {
  if (g.phase !== "riding") return;
  const dt = Math.min(Math.max(delta, 0), 0.04);
  const trail = trailFor(g.trail);
  const speed = trail.speed + Math.min(g.elapsed * 1.4, 105);
  g.lastEvent = null;
  g.elapsed += dt;
  g.distance = Math.min(MAX_DISTANCE, g.distance + (speed * dt) / 12);
  g.velocityY += 1320 * dt;
  g.playerY += g.velocityY * dt;
  if (g.playerY >= 0) {
    g.playerY = 0;
    g.velocityY = 0;
    g.jumps = 0;
  }

  g.nextObstacle -= dt;
  if (g.nextObstacle <= 0) {
    const kind = random(g) > 0.5 ? "cactus" : "rock";
    g.obstacles.push({
      id: g.sequence++,
      x: g.width + 45,
      width: kind === "cactus" ? 30 : 39,
      height: kind === "cactus" ? 56 : 31,
      kind,
    });
    g.nextObstacle = trail.gap + random(g) * 0.75;
  }
  g.nextPickup -= dt;
  if (g.nextPickup <= 0) {
    const x = g.width + 80;
    const y = random(g) > 0.4 ? -88 : -145;
    for (let i = 0; i < 3; i++)
      g.pickups.push({ id: g.sequence++, x: x + i * 45, y, taken: false });
    g.nextPickup = 2.8 + random(g) * 1.7;
  }

  const px = playerX(g);
  for (const o of g.obstacles) {
    o.x -= speed * dt;
    // The forgiving collision box sits within the wheels and body artwork.
    if (o.x < px + 28 && o.x + o.width > px - 29 && g.playerY > -o.height + 9) {
      g.phase = "finished";
      g.lastEvent = "crash";
      break;
    }
  }
  if (g.phase === "riding") {
    for (const p of g.pickups) {
      p.x -= speed * dt;
      if (
        !p.taken &&
        Math.abs(p.x - px) < 43 &&
        Math.abs(p.y - (g.playerY - 45)) < 48
      ) {
        p.taken = true;
        g.cheese = Math.min(MAX_CHEESE, g.cheese + 1);
        g.lastEvent = "cheese";
        for (let i = 0; i < 7; i++)
          g.particles.push({
            x: p.x,
            y: groundY(g) + p.y,
            vx: (random(g) - 0.5) * 130,
            vy: -random(g) * 150,
            age: 0,
            life: 0.5,
            color: "#e5ae45",
          });
      }
    }
  }
  for (const p of g.particles) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 250 * dt;
  }
  g.obstacles = g.obstacles.filter((o) => o.x > -80);
  g.pickups = g.pickups.filter((p) => p.x > -50 && !p.taken);
  g.particles = g.particles.filter((p) => p.age < p.life);
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
