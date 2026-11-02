import { useCallback, useEffect, useRef, useState } from "react";
import {
  TRAILS,
  STORAGE_KEY,
  PROFILE_KEY,
  RANKS,
  UPGRADE_COST,
  freshGame,
  jump,
  update,
  fire,
  special,
  parseSaved,
  parseProfile,
  buyUpgrade,
  rankLevel,
  maxHp,
  maxJumps,
  cannonDamage,
  bikeSpeed,
  clearInput,
  groundY,
  summonBoss,
  trailFor,
  type Ride,
  type TrailId,
  type Upgrade,
  type Profile,
  type GameState,
} from "./game";
import {
  initialTelemetry,
  watchTelemetry,
  wheelFresh,
  turboAvailable,
  type Telemetry,
} from "./telemetry";
import { render } from "./art";
import { Icon, MouseMark } from "./icons";
import { RideAudio } from "./sound";

const integer = (n: number) => n.toLocaleString("en-US");
const exact = (n: string | null | undefined) =>
  n == null ? "Unavailable" : BigInt(n).toLocaleString("en-US");
function load() {
  try {
    return {
      ...parseSaved(localStorage.getItem(STORAGE_KEY)),
      profile: parseProfile(localStorage.getItem(PROFILE_KEY)),
      available: true,
    };
  } catch {
    return {
      ...parseSaved(null),
      profile: parseProfile(null),
      available: false,
    };
  }
}
function screen(g: GameState) {
  return {
    distance: Math.floor(g.distance),
    cheese: g.cheese,
    phase: g.phase,
    hp: g.hp,
    speed: Math.round(bikeSpeed(g) * 0.3),
    bomb: Math.ceil(g.bombCooldown),
    storm: Math.ceil(g.stormCooldown),
    fuel: g.hoverFuel,
    kills: g.kills,
    bossHp: g.boss?.hp ?? null,
    bossMax: g.boss?.maxHp ?? 420,
    won: g.bossDefeated,
    nitro: g.nitro,
    turbo: g.turbo,
    rush: g.bossRush,
  };
}
function SpeedDial({ speed }: { speed: number }) {
  return (
    <svg className="speed-dial" viewBox="0 0 64 48" aria-hidden="true">
      <path
        d="M8 39a25 25 0 1 1 48 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        opacity=".25"
      />
      <path
        d="M8 39a25 25 0 1 1 48 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        pathLength="100"
        strokeDasharray={`${Math.min(speed / 2, 100)} 100`}
      />
      <path
        d="M32 33 15 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        transform={`rotate(${Math.min(speed, 210)},32,33)`}
      />
      <circle cx="32" cy="33" r="4" fill="currentColor" />
    </svg>
  );
}
function HoldButton({
  direction,
  label,
  children,
  onHold,
  disabled,
}: {
  direction: "up" | "down" | "left" | "right";
  label: string;
  children: React.ReactNode;
  onHold: (direction: "up" | "down" | "left" | "right", down: boolean) => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      className={`direction direction-${direction}`}
      aria-label={label}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(direction, true);
      }}
      onPointerUp={(e) => {
        onHold(direction, false);
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => onHold(direction, false)}
      onLostPointerCapture={() => onHold(direction, false)}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          onHold(direction, true);
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onHold(direction, false);
        }
      }}
      onBlur={() => onHold(direction, false)}
    >
      {children}
    </button>
  );
}
function TrailArt({ trail }: { trail: TrailId }) {
  const p = trailFor(trail).palette;
  return (
    <svg
      className="trail-art"
      viewBox="0 0 360 130"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="360" height="130" fill={p.sky} />
      <circle cx="269" cy="39" r="22" fill={p.sun} />
      {trail === "moon" && (
        <>
          <circle cx="279" cy="32" r="19" fill={p.sky} />
          <g fill="#e9dfaf">
            <circle cx="42" cy="20" r="1.2" />
            <circle cx="181" cy="24" r="1.2" />
            <circle cx="324" cy="13" r="1.2" />
            <circle cx="125" cy="42" r="1" />
          </g>
        </>
      )}
      <path
        d="m0 96 39-8 14-34h38l8-10h56l13 37 38 15 31-33h32l7-19h27l13 52 44 6v28H0Z"
        fill={p.far}
      />
      <path
        d="m0 109 30-8 12-25h45l9 18 45 17 31-5 13-24 10-40h48l9 35 23 5 20 26 65-7v29H0Z"
        fill={p.near}
      />
      <path d="M0 112q90-12 180 0t180-2v20H0Z" fill={p.ground} />
      <path
        d="M0 119q90-7 180 0t180-2"
        fill="none"
        stroke={p.ink}
        strokeWidth=".7"
      />
      <path
        d="M46 115V87m0 13H36V89m10 15h10V94"
        fill="none"
        stroke={p.plant}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M301 117V96m0 10h-8v-8m8 12h7v-9"
        fill="none"
        stroke={p.plant}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {trail !== "moon" && (
        <path
          d="M22 28h38m-24 5h16m125-13h45"
          stroke={p.plant}
          strokeWidth=".8"
        />
      )}
    </svg>
  );
}

export default function App() {
  const [initial] = useState(load);
  const [rides, setRides] = useState<Ride[]>(initial.rides);
  const [best, setBest] = useState(initial.best);
  const [profile, setProfile] = useState(initial.profile);
  const profileRef = useRef(profile);
  const [storageAvailable, setStorageAvailable] = useState(initial.available);
  const [trail, setTrail] = useState<TrailId>("valley");
  const game = useRef(
    freshGame("valley", 1100, 440, 12345, initial.profile.levels),
  );
  const [stats, setStats] = useState(() => screen(game.current));
  const [sound, setSound] = useState(initial.sound);
  const [dialog, setDialog] = useState<"help" | "clear" | null>(null);
  const [notice, setNotice] = useState("");
  const [garageOpen, setGarageOpen] = useState(true);
  const [filter, setFilter] = useState<TrailId | "all">("all");
  const [sort, setSort] = useState<"recent" | "best">("recent");
  const [turbo, setTurbo] = useState(true);
  const [telemetry, setTelemetry] = useState<Telemetry>(initialTelemetry);
  const [now, setNow] = useState(Date.now());
  const refreshTelemetry = useRef<() => void>(() => {});
  const turboRef = useRef(false);
  const turboArmedRef = useRef(turbo);
  const telemetryRef = useRef(telemetry);
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogOpener = useRef<HTMLElement | null>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const audio = useRef(new RideAudio());
  const soundRef = useRef(sound);
  const dialogOpen = useRef(false);
  const savedRide = useRef(false);
  const phase = stats.phase,
    locked = phase === "riding" || phase === "paused";
  const wheel = telemetry.status.data;
  const fresh = wheelFresh(telemetry.status, now);
  const canTurbo = turboAvailable(telemetry.status, now);
  const connected =
    fresh &&
    !telemetry.economy.error &&
    !!telemetry.economy.receivedAt &&
    now - telemetry.economy.receivedAt < 35_000;
  const connecting = telemetry.status.loading || telemetry.economy.loading;
  const feedLabel = connecting
    ? "Connecting"
    : connected
      ? "Live"
      : wheel
        ? "Stale / partial"
        : "Offline";
  const turboLabel = !turbo
    ? "Off"
    : canTurbo
      ? "Active · 1.35× + spread"
      : !fresh
        ? "Armed · waiting for data"
        : wheel?.coreStatus === "IDLE"
          ? "Armed · wheel idle"
          : "Armed · awaiting wheel speed";
  const filtered = rides
    .filter((r) => filter === "all" || r.trail === filter)
    .sort((a, b) =>
      sort === "best"
        ? b.distance - a.distance || b.date - a.date
        : b.date - a.date,
    );

  const saveProfile = useCallback((value: Profile) => {
    profileRef.current = value;
    setProfile(value);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rides, sound, best }));
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch {
      setStorageAvailable(false);
    }
  }, [rides, sound, best, profile]);
  useEffect(() => {
    const watcher = watchTelemetry((value) => {
      telemetryRef.current = value;
      setTelemetry(value);
    });
    refreshTelemetry.current = watcher.refresh;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      watcher.stop();
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    turboArmedRef.current = turbo;
    turboRef.current = turbo && canTurbo;
    game.current.turbo = turboRef.current;
  }, [turbo, canTurbo]);

  const finish = useCallback(() => {
    const g = game.current;
    if (savedRide.current) return;
    savedRide.current = true;
    const ride: Ride = {
      id: crypto.randomUUID(),
      trail: g.trail,
      distance: Math.floor(g.distance),
      cheese: g.cheese,
      date: Date.now(),
    };
    setRides((previous) => [ride, ...previous].slice(0, 20));
    setBest((previous) => Math.max(previous, ride.distance));
    setNotice(
      g.bossDefeated
        ? "Baron Von Claw defeated. 60 bonus Cheese Coins collected."
        : `Ride finished. ${ride.distance} meters and ${ride.cheese} Cheese Coins collected.`,
    );
  }, []);
  const pause = useCallback(() => {
    const g = game.current;
    clearInput(g);
    if (g.phase !== "riding") return;
    g.phase = "paused";
    setStats(screen(g));
    setNotice("Ride paused. Resume when ready.");
  }, []);
  const resume = useCallback(() => {
    if (game.current.phase !== "paused") return;
    game.current.phase = "riding";
    setStats(screen(game.current));
    setNotice("Ride resumed.");
    canvasRef.current?.focus({ preventScroll: true });
    if (matchMedia("(max-width: 600px)").matches)
      canvasRef.current
        ?.closest(".game-shell")
        ?.scrollIntoView({ block: "start", behavior: "instant" });
    if (soundRef.current) void audio.current.enable();
  }, []);
  const start = useCallback((rush = false) => {
    const old = game.current;
    game.current = freshGame(
      old.trail,
      old.width,
      old.height,
      crypto.getRandomValues(new Uint32Array(1))[0],
      profileRef.current.levels,
    );
    const g = game.current;
    g.phase = "riding";
    g.turbo = turboRef.current;
    g.bossRush = rush;
    if (rush) summonBoss(g);
    savedRide.current = false;
    setStats(screen(g));
    setNotice(
      rush
        ? "Boss rush started. Aim at the Cat-Blimp."
        : "Ride started. Cannon firing. Hold right for nitro.",
    );
    canvasRef.current?.focus({ preventScroll: true });
    if (matchMedia("(max-width: 600px)").matches)
      canvasRef.current
        ?.closest(".game-shell")
        ?.scrollIntoView({ block: "start", behavior: "instant" });
    if (soundRef.current) void audio.current.enable();
  }, []);
  const useSpecial = useCallback(
    (kind: "bomb" | "storm") => {
      const before = game.current.cheese;
      if (special(game.current, kind)) {
        if (game.current.cheese > before)
          saveProfile({
            ...profileRef.current,
            coins: Math.min(
              10000000,
              profileRef.current.coins + game.current.cheese - before,
            ),
          });
        setStats(screen(game.current));
        setNotice(
          kind === "bomb"
            ? "Mega Cheese Bomb unleashed. Recharges in 8 seconds."
            : "Wheel Lightning Storm unleashed. Recharges in 12 seconds.",
        );
      }
    },
    [saveProfile],
  );
  const hold = useCallback(
    (direction: "up" | "down" | "left" | "right", down: boolean) => {
      const g = game.current;
      if (g.phase !== "riding") {
        clearInput(g);
        return;
      }
      if (direction === "up" && down && !g.input.up) jump(g);
      g.input[direction] = down;
    },
    [],
  );
  const chooseTrail = (id: TrailId) => {
    if (locked) return;
    const g = game.current;
    game.current = freshGame(
      id,
      g.width,
      g.height,
      12345,
      profileRef.current.levels,
    );
    game.current.turbo = turboRef.current;
    setTrail(id);
    setStats(screen(game.current));
    setNotice(`${trailFor(id).name} selected.`);
  };
  const upgrade = (kind: Upgrade) => {
    pause();
    const next = buyUpgrade(profileRef.current, kind);
    if (!next) return;
    const g = game.current,
      beforeHp = maxHp(g.levels);
    saveProfile(next);
    g.levels = { ...next.levels };
    g.hp += maxHp(g.levels) - beforeHp;
    setStats(screen(g));
    audio.current.play("upgrade");
    setNotice(
      `${kind === "cannon" ? "Cannon" : kind === "jetpack" ? "Jetpack" : "Armor"} upgraded to level ${next.levels[kind]}. 40 Cheese Coins spent.`,
    );
  };
  const toggleSound = async () => {
    if (soundRef.current) {
      audio.current.enabled = false;
      soundRef.current = false;
      setSound(false);
      return;
    }
    if (await audio.current.enable()) {
      soundRef.current = true;
      setSound(true);
    } else
      setNotice(
        "Sound unavailable. Try enabling sound again; the game remains playable.",
      );
  };
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const c = canvasRef.current!,
      ctx = c.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const r = c.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio || 1, 2),
        g = game.current;
      const oldWidth = g.width;
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      g.width = (r.width / r.height) * 440;
      g.height = 440;
      g.playerOffset *= g.width / oldWidth;
      g.aim = null;
      ctx.setTransform(c.width / g.width, 0, 0, c.height / g.height, 0, 0);
      render(ctx, g, reduced);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(c);
    resize();
    let raf = 0,
      previous = 0,
      lastSync = 0;
    const draw = (at: number) => {
      const g = game.current,
        oldCoins = g.cheese;
      g.turbo =
        turboArmedRef.current &&
        turboAvailable(telemetryRef.current.status, Date.now());
      update(g, previous ? (at - previous) / 1000 : 0);
      previous = at;
      if (g.cheese > oldCoins)
        saveProfile({
          ...profileRef.current,
          coins: Math.min(
            10000000,
            profileRef.current.coins + g.cheese - oldCoins,
          ),
        });
      g.events.splice(0).forEach((kind) => audio.current.play(kind));
      if (g.phase === "finished" && !savedRide.current) finish();
      if (at - lastSync > 80) {
        setStats(screen(g));
        lastSync = at;
      }
      ctx.setTransform(c.width / g.width, 0, 0, c.height / g.height, 0, 0);
      render(ctx, g, reduced);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [finish, reduced, saveProfile]);
  useEffect(() => {
    const mapping: Record<string, "up" | "down" | "left" | "right"> = {
      Space: "up",
      ArrowUp: "up",
      KeyW: "up",
      ArrowDown: "down",
      KeyS: "down",
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
    };
    const down = (e: KeyboardEvent) => {
      if (dialogOpen.current || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement;
      if (target.closest("a,select,input,dialog")) return;
      if (e.code === "KeyP" || e.code === "Escape") {
        if (game.current.phase === "riding") {
          e.preventDefault();
          pause();
        } else if (game.current.phase === "paused") {
          e.preventDefault();
          resume();
        }
        return;
      }
      if (
        target.closest("button") &&
        (e.code === "Space" || e.code === "Enter")
      )
        return;
      if (mapping[e.code]) {
        if (game.current.phase !== "riding") return;
        e.preventDefault();
        if (!e.repeat) hold(mapping[e.code], true);
      } else if (!e.repeat && (e.code === "KeyE" || e.code === "KeyQ")) {
        e.preventDefault();
        useSpecial(e.code === "KeyE" ? "bomb" : "storm");
      }
    };
    const up = (e: KeyboardEvent) => {
      if (mapping[e.code]) hold(mapping[e.code], false);
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
      removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [hold, pause, resume, useSpecial]);
  useEffect(() => {
    if (phase === "finished" || phase === "paused")
      actionRef.current?.focus({ preventScroll: true });
  }, [phase]);
  useEffect(() => {
    dialogOpen.current = dialog !== null;
    if (dialog && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!dialog && dialogRef.current?.open) {
      dialogRef.current.close();
      queueMicrotask(() =>
        dialogOpener.current?.focus({ preventScroll: true }),
      );
    }
  }, [dialog]);
  const openDialog = (kind: "help" | "clear") => {
    dialogOpener.current = document.activeElement as HTMLElement;
    pause();
    setDialog(kind);
  };
  const aim = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (game.current.phase !== "riding") return;
    const r = e.currentTarget.getBoundingClientRect(),
      g = game.current;
    g.aim = {
      x: ((e.clientX - r.left) / r.width) * g.width,
      y: ((e.clientY - r.top) / r.height) * g.height - groundY(g),
    };
  };
  const downloadLog = () => {
    const csv = [
      "Trail,Distance (m),Cheese Coins,Date (UTC)",
      ...rides.map(
        (r) =>
          `${trailFor(r.trail).name},${r.distance},${r.cheese},${new Date(r.date).toISOString()}`,
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "squeekrider-ride-log.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Ride log exported as CSV.");
  };

  return (
    <>
      <a className="skip-link" href="#ride">
        Skip to the ride
      </a>
      <header className="site-header page-width">
        <a
          className="brand"
          href="#ride"
          aria-label="SqueekRider Odyssey, back to the ride"
        >
          <MouseMark />
          <span>
            SqueekRider<span className="brand-sub">Odyssey</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#ride">Play</a>
          <a href="#garage">Royal garage</a>
          <a href="#ride-log">Ride log</a>
        </nav>
        <div className="header-tools">
          <button
            className="icon-button"
            type="button"
            onClick={() => void toggleSound()}
            aria-label={sound ? "Mute sound" : "Enable sound"}
            title={sound ? "Mute sound" : "Enable sound"}
          >
            <Icon name={sound ? "sound" : "mute"} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => openDialog("help")}
            aria-label="How to play"
            title="How to play"
          >
            <Icon name="help" />
          </button>
        </div>
      </header>
      <main className="page-width">
        <section
          id="ride"
          className="ride-section"
          aria-labelledby="page-title"
        >
          <div className="intro">
            <div>
              <h1 id="page-title">
                Small rider. <span>Royal firepower.</span>
              </h1>
              <p>
                A wheel-bike action runner, fueled by live Squeekchain
                telemetry.
              </p>
            </div>
            <div className="personal-best">
              <Icon name="trophy" />
              <span>
                Best ride <strong>{integer(best)} m</strong>
              </span>
            </div>
          </div>
          <div className="game-shell">
            <div
              className="telemetry"
              aria-label="Live Squeekchain speedometer"
            >
              <div className="speedometer">
                <SpeedDial speed={phase === "riding" ? stats.speed : 0} />
                <div>
                  <strong>
                    {phase === "riding" ? stats.speed : 0}
                    <small>km/h</small>
                  </strong>
                  <span>Bike speed</span>
                </div>
              </div>
              <dl className="chain-values">
                <div>
                  <dt>Wheel core</dt>
                  <dd className={fresh ? "core-fresh" : ""}>
                    {wheel?.coreStatus ?? "Connecting"}
                  </dd>
                </div>
                <div>
                  <dt>rpmMilli</dt>
                  <dd>{wheel ? integer(wheel.rpmMilli) : "Unavailable"}</dd>
                </div>
                <div>
                  <dt>Anchor block</dt>
                  <dd>{exact(wheel?.blockHeight)}</dd>
                </div>
                <div>
                  <dt>Settlements</dt>
                  <dd title="totalSettlements from the economy API">
                    {exact(telemetry.economy.data?.totalSettlements)}
                  </dd>
                </div>
              </dl>
              <span className={`connection ${connected ? "is-live" : ""}`}>
                <i />
                {feedLabel}
              </span>
            </div>
            <div className={`game-stage phase-${phase} trail-${trail}`}>
              <canvas
                ref={canvasRef}
                tabIndex={0}
                role="application"
                aria-label="SqueekRider wheel-bike action game"
                aria-describedby="game-directions"
                onPointerMove={(e) => {
                  if (e.pointerType === "mouse") aim(e);
                }}
                onPointerDown={(e) => {
                  if (game.current.phase === "riding") {
                    e.preventDefault();
                    aim(e);
                    fire(game.current);
                    canvasRef.current?.focus({ preventScroll: true });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.code === "KeyF") {
                    game.current.aim = null;
                    setNotice("Cannon aim reset to forward.");
                  }
                }}
              />
              <div className="scene-top">
                <span className="location">
                  <Icon name={trail === "moon" ? "moon" : "sun"} size={16} />
                  {trailFor(trail).name}
                </span>
                <div className="ride-hud">
                  <span>
                    <strong>{integer(stats.distance)}</strong> m
                  </span>
                  <span className="cheese-count">
                    <Icon name="cheese" size={18} />
                    <strong>{stats.cheese}</strong>
                  </span>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Pause ride"
                    onClick={pause}
                    disabled={phase !== "riding"}
                  >
                    <Icon name="pause" size={18} />
                  </button>
                </div>
              </div>
              {(phase === "ready" ||
                phase === "paused" ||
                phase === "finished") && (
                <div
                  className={`state-overlay ${phase === "ready" ? "ready-overlay" : "state-scrim"}`}
                >
                  <div className="state-content">
                    {phase !== "ready" && (
                      <h2>
                        {phase === "paused"
                          ? "Hold that wheel."
                          : stats.won
                            ? "The Baron is toast."
                            : "Down. Never out."}
                      </h2>
                    )}
                    {phase !== "ready" && (
                      <p>
                        {phase === "paused"
                          ? "Your ride is paused."
                          : stats.won
                            ? "Cat-Blimp defeated. +60 Cheese Coins."
                            : `${integer(stats.distance)} m · ${stats.cheese} Cheese Coins · ${stats.kills} enemies`}
                      </p>
                    )}
                    <button
                      ref={actionRef}
                      className="primary-button"
                      type="button"
                      onClick={() => (phase === "paused" ? resume() : start())}
                    >
                      <Icon
                        name={phase === "finished" ? "reset" : "play"}
                        size={18}
                      />
                      {phase === "ready"
                        ? "Start riding"
                        : phase === "paused"
                          ? "Resume ride"
                          : "Ride again"}
                    </button>
                    {phase === "paused" && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => {
                          game.current.phase = "finished";
                          finish();
                          setStats(screen(game.current));
                        }}
                      >
                        Finish this ride
                      </button>
                    )}
                    {phase === "ready" && (
                      <span className="start-hint">
                        Auto-fire on · hold ↑ to hover
                      </span>
                    )}
                  </div>
                </div>
              )}
              {phase === "riding" && (
                <>
                  <div className="armor-hud">
                    <span>
                      Armor {stats.hp}/{maxHp(profile.levels)}
                    </span>
                    <progress
                      value={stats.hp}
                      max={maxHp(profile.levels)}
                      aria-label="Armor health"
                    />
                    <span>Thruster</span>
                    <progress
                      className="fuel-meter"
                      value={stats.fuel}
                      max={1}
                      aria-label="Thruster fuel"
                    />
                  </div>
                  <span
                    className={`drive-state ${stats.nitro || stats.turbo ? "boosting" : ""}`}
                  >
                    {stats.nitro
                      ? "Nitro 1.55×"
                      : stats.turbo
                        ? "Wheel turbo 1.35×"
                        : "Cannon auto-firing"}
                  </span>
                </>
              )}
              {stats.bossHp !== null && phase === "riding" && (
                <div className="boss-health">
                  <span>
                    Baron Von Claw{" "}
                    <strong>
                      {Math.max(0, Math.ceil(stats.bossHp))}/{stats.bossMax}
                    </strong>
                  </span>
                  <progress
                    value={Math.max(0, stats.bossHp)}
                    max={stats.bossMax}
                    aria-label="Baron Von Claw boss health"
                  />
                </div>
              )}
              {phase === "riding" && stats.bossHp === null && (
                <span className="boss-distance">
                  Cat-Blimp in {Math.max(0, 600 - stats.distance)} m
                </span>
              )}
            </div>
            <div className="game-toolbar">
              <label className="turbo-toggle">
                <input
                  type="checkbox"
                  checked={turbo}
                  onChange={(e) => setTurbo(e.target.checked)}
                />
                <span className="switch-track" aria-hidden="true" />
                <span>
                  <strong>Live Wheel Turbo</strong>
                  <small>{turboLabel}</small>
                </span>
              </label>
              <div className="battle-actions">
                <button
                  className="secondary-button"
                  type="button"
                  disabled={locked}
                  onClick={() => start(true)}
                >
                  <Icon name="flag" size={17} />
                  Boss Rush
                </button>
                <a
                  className="garage-link"
                  href="#garage"
                  onClick={() => {
                    pause();
                    setGarageOpen(true);
                  }}
                >
                  Open garage <Icon name="arrow" size={16} />
                </a>
              </div>
            </div>
            <div className="game-controls">
              <div
                className="direction-controls"
                aria-label="Flight and movement controls"
              >
                <HoldButton
                  direction="left"
                  label="Move back (A or Left Arrow)"
                  onHold={hold}
                  disabled={phase !== "riding"}
                >
                  <span aria-hidden="true">←</span>
                  <small>Back</small>
                </HoldButton>
                <div className="vertical-controls">
                  <HoldButton
                    direction="up"
                    label="Fly up and jump (W, Up Arrow or Space), hold to hover"
                    onHold={hold}
                    disabled={phase !== "riding"}
                  >
                    <span aria-hidden="true">↑</span>
                    <small>Fly</small>
                  </HoldButton>
                  <HoldButton
                    direction="down"
                    label="Dive down (S or Down Arrow)"
                    onHold={hold}
                    disabled={phase !== "riding"}
                  >
                    <span aria-hidden="true">↓</span>
                    <small>Dive</small>
                  </HoldButton>
                </div>
                <HoldButton
                  direction="right"
                  label="Move front and nitro boost (D or Right Arrow)"
                  onHold={hold}
                  disabled={phase !== "riding"}
                >
                  <span aria-hidden="true">→</span>
                  <small>Nitro</small>
                </HoldButton>
              </div>
              <div className="control-copy" id="game-directions">
                <p>
                  <kbd>W A S D</kbd> or arrows to move
                </p>
                <span>Space to fly · hold to hover · click to aim</span>
              </div>
              <div className="weapon-controls">
                <button
                  type="button"
                  className="weapon-button"
                  onClick={() => useSpecial("bomb")}
                  disabled={phase !== "riding" || stats.bomb > 0}
                >
                  <Icon name="cheese" size={20} />
                  <span>
                    Cheese Bomb
                    <small>
                      {stats.bomb > 0 ? (
                        `${stats.bomb}s recharge`
                      ) : (
                        <>
                          E <span className="weapon-hint">· ready</span>
                        </>
                      )}
                    </small>
                  </span>
                </button>
                <button
                  type="button"
                  className="weapon-button storm-button"
                  onClick={() => useSpecial("storm")}
                  disabled={phase !== "riding" || stats.storm > 0}
                >
                  <span className="lightning-icon" aria-hidden="true">
                    ϟ
                  </span>
                  <span>
                    Wheel Storm
                    <small>
                      {stats.storm > 0 ? (
                        `${stats.storm}s recharge`
                      ) : (
                        <>
                          Q <span className="weapon-hint">· ready</span>
                        </>
                      )}
                    </small>
                  </span>
                </button>
              </div>
            </div>
          </div>
          <div className="telemetry-note">
            <span>
              {connecting
                ? "Connecting to Squeektoshi’s wheel…"
                : connected
                  ? "Squeektoshi’s wheel · updates every 15s"
                  : "Connection interrupted · retrying every 15s"}
              {wheel && !connected && !connecting
                ? " · last-known readings"
                : ""}
            </span>
            <button
              type="button"
              className="text-button"
              onClick={() => refreshTelemetry.current()}
            >
              Refresh data <Icon name="reset" size={15} />
            </button>
          </div>
          {telemetry.economy.data &&
            telemetry.economy.data.totalSettlements == null && (
              <p className="missing-data">
                The economy API does not currently report totalSettlements.
              </p>
            )}
          {telemetry.economy.error && (
            <p className="missing-data">
              Economy readings unavailable. Retrying every 15s.
            </p>
          )}
        </section>

        <section
          id="garage"
          className="garage-section"
          aria-labelledby="garage-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="garage-title">Royal Bike Garage</h2>
              <p>Spend Cheese Coins on upgrades, 40 coins per level.</p>
            </div>
            <button
              type="button"
              className="text-button"
              aria-expanded={garageOpen}
              aria-controls="garage-content"
              onClick={() => {
                pause();
                setGarageOpen(!garageOpen);
              }}
            >
              {garageOpen ? "Close garage" : "Open garage"}
              <span aria-hidden="true">{garageOpen ? "−" : "+"}</span>
            </button>
          </div>
          {garageOpen && (
            <div id="garage-content">
              <div className="garage-summary">
                <div className="rank-mark" aria-hidden="true">
                  <Icon name="trophy" size={28} />
                </div>
                <div className="rank-info">
                  <strong>
                    Level {rankLevel(profile.levels)} ·{" "}
                    {RANKS[rankLevel(profile.levels) - 1]}
                  </strong>
                  <span>
                    {rankLevel(profile.levels) === 5
                      ? "Your wheels are legendary."
                      : `${(profile.levels.cannon + profile.levels.jetpack + profile.levels.armor - 3) % 3}/3 upgrades to next rank`}
                  </span>
                </div>
                <div className="coin-bank">
                  <Icon name="cheese" size={22} />
                  <strong>{integer(profile.coins)}</strong>
                  <span>Cheese Coins</span>
                </div>
              </div>
              <div className="upgrade-grid">
                {(["cannon", "jetpack", "armor"] as Upgrade[]).map((kind) => {
                  const level = profile.levels[kind],
                    capped = level === 5;
                  return (
                    <article className={`upgrade upgrade-${kind}`} key={kind}>
                      <div className="upgrade-title">
                        <span className="upgrade-icon">
                          <Icon
                            name={
                              kind === "cannon"
                                ? "sun"
                                : kind === "jetpack"
                                  ? "jump"
                                  : "check"
                            }
                            size={25}
                          />
                        </span>
                        <span>Level {level} / 5</span>
                      </div>
                      <h3>
                        {kind === "cannon"
                          ? "Golden Seed Cannon"
                          : kind === "jetpack"
                            ? "Jetpack & jumps"
                            : "Max HP armor"}
                      </h3>
                      <p>
                        {kind === "cannon"
                          ? `${cannonDamage(profile.levels)} damage per seed`
                          : kind === "jetpack"
                            ? `${maxJumps(profile.levels)} jumps · ${(1.7 + level * 0.3).toFixed(1)}s hover`
                            : `${maxHp(profile.levels)} maximum HP`}
                      </p>
                      <div className="level-pips" aria-hidden="true">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <i key={n} className={n <= level ? "filled" : ""} />
                        ))}
                      </div>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => upgrade(kind)}
                        disabled={capped || profile.coins < UPGRADE_COST}
                        aria-label={
                          capped
                            ? `${kind} fully upgraded`
                            : profile.coins < 40
                              ? `${40 - profile.coins} more coins needed to upgrade ${kind}`
                              : `Upgrade ${kind} for 40 Cheese Coins`
                        }
                      >
                        {capped ? (
                          "Fully upgraded"
                        ) : profile.coins < 40 ? (
                          `${40 - profile.coins} more coins needed`
                        ) : (
                          <>
                            Upgrade{" "}
                            <span>
                              40 <Icon name="cheese" size={15} />
                            </span>
                          </>
                        )}
                      </button>
                    </article>
                  );
                })}
              </div>
              <p className="garage-note">
                Upgrades pause your ride and apply immediately. Coins and ranks
                stay{" "}
                {storageAvailable
                  ? "in this browser"
                  : "for this visit; storage is unavailable"}
                .
              </p>
            </div>
          )}
        </section>

        <section
          id="trails"
          className="trails-section"
          aria-labelledby="trails-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="trails-title">Choose your battleground.</h2>
              <p>
                {locked
                  ? "Finish this ride to change trails or start Boss Rush."
                  : "Pick a trail and ride toward the Baron."}
              </p>
            </div>
          </div>
          <div className="trail-grid">
            {TRAILS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                className={`trail-card ${trail === t.id ? "selected" : ""}`}
                aria-pressed={trail === t.id}
                disabled={locked}
                onClick={() => chooseTrail(t.id)}
              >
                <div className="trail-image">
                  <TrailArt trail={t.id} />
                  {trail === t.id && (
                    <span className="selected-mark">
                      <Icon name="check" size={15} />
                      Selected
                    </span>
                  )}
                </div>
                <div className="trail-details">
                  <div className="trail-title-row">
                    <h3>{t.name}</h3>
                    <span className="trail-speed">
                      {["Fast", "Faster", "Fastest"][i]}
                    </span>
                  </div>
                  <p>{t.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
        <section
          id="field-guide"
          className="field-guide"
          aria-labelledby="guide-title"
        >
          <div>
            <h2 id="guide-title">Outrun the claws.</h2>
            <p>
              Roll through mine-carts and rocket goblins. At 600 m, Baron Von
              Claw brings his Clockwork Cat-Blimp.
            </p>
          </div>
          <div className="guide-items">
            <div>
              <Icon name="jump" />
              <p>
                <strong>Fly, then dive.</strong> Tap up for multi-jumps. Hold to
                hover while thruster fuel lasts; land to refill. Hold right for
                1.55× nitro.
              </p>
            </div>
            <div>
              <Icon name="sun" />
              <p>
                <strong>Keep the cannon singing.</strong> Golden seeds fire
                automatically. Click or tap the scene to aim. Press F to aim
                forward again.
              </p>
            </div>
            <div>
              <Icon name="cheese" />
              <p>
                <strong>Spend your spoils.</strong> Pick up coins, earn 5 per
                enemy, and 60 for the Baron. E clears hazards; Q calls
                lightning.
              </p>
            </div>
          </div>
        </section>
        <section
          id="ride-log"
          className="log-section"
          aria-labelledby="log-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="log-title">Tales from the fast lane.</h2>
              <p>
                Latest 20 rides, saved{" "}
                {storageAvailable
                  ? "only in this browser"
                  : "for this visit only"}
                .
              </p>
            </div>
          </div>
          <div className="log-toolbar">
            <div className="log-filters">
              <label>
                Trail
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as TrailId | "all")}
                >
                  <option value="all">All trails</option>
                  {TRAILS.map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sort by
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "recent" | "best")}
                >
                  <option value="recent">Latest ride</option>
                  <option value="best">Longest ride</option>
                </select>
              </label>
            </div>
            <div className="log-actions">
              <button
                type="button"
                className="text-button"
                disabled={!rides.length}
                onClick={downloadLog}
              >
                <Icon name="download" size={18} />
                Export log
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Clear ride log"
                disabled={!rides.length}
                onClick={() => openDialog("clear")}
              >
                <Icon name="reset" size={18} />
              </button>
            </div>
          </div>
          {filtered.length ? (
            <div className="log-table-wrap">
              <table>
                <caption className="sr-only">
                  Ride history sorted by{" "}
                  {sort === "best" ? "longest" : "latest"} ride
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Trail</th>
                    <th scope="col">Distance</th>
                    <th scope="col">Coins</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td>{trailFor(r.trail).name}</td>
                      <td>{integer(r.distance)} m</td>
                      <td>{integer(r.cheese)}</td>
                      <td>
                        <time dateTime={new Date(r.date).toISOString()}>
                          {new Intl.DateTimeFormat("en", {
                            month: "short",
                            day: "numeric",
                          }).format(r.date)}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="log-empty">
              <Icon name="flag" size={28} />
              <div>
                <h3>
                  {rides.length
                    ? "No rides on this trail yet."
                    : "Your next legend starts here."}
                </h3>
                <p>
                  {rides.length
                    ? "Choose another trail filter to see your rides."
                    : "Start a ride to save your first run."}
                </p>
              </div>
              <a className="text-button" href="#ride">
                Back to the ride <Icon name="arrow" size={16} />
              </a>
            </div>
          )}
        </section>
      </main>
      <footer className="site-footer page-width">
        <a className="footer-brand" href="#ride">
          <MouseMark />
          SqueekRider Odyssey
        </a>
        <span>Small rider. Long live the wheel.</span>
        <button
          type="button"
          className="text-button"
          onClick={() => openDialog("help")}
        >
          How to play <Icon name="arrow" size={16} />
        </button>
      </footer>
      <p className="sr-only" role="status" aria-live="polite">
        {notice}
      </p>
      <dialog
        ref={dialogRef}
        aria-labelledby="dialog-title"
        onCancel={() => setDialog(null)}
        onClose={() => setDialog(null)}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const controls = e.currentTarget.querySelectorAll<HTMLElement>(
            "button:not(:disabled),a[href],select",
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="dialog-header">
          <h2 id="dialog-title">
            {dialog === "clear" ? "Clear ride log?" : "Take the wheel."}
          </h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={() => setDialog(null)}
          >
            <Icon name="close" />
          </button>
        </div>
        {dialog === "clear" ? (
          <>
            <p>
              This removes saved rides and personal best. Your garage upgrades
              and Cheese Coins stay. Export your log first to keep it.
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDialog(null)}
              >
                Keep rides
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setRides([]);
                  setBest(0);
                  setDialog(null);
                  setNotice(
                    "Ride log and personal best cleared. Garage progress kept.",
                  );
                }}
              >
                Clear ride log
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              Help Pip become the Supreme Wheel Monarch. Dodge, collect, and
              shoot your way to Baron Von Claw at 600 m.
            </p>
            <dl className="shortcuts">
              <div>
                <dt>Fly / multi-jump</dt>
                <dd>
                  W / ↑ / Space
                  <br />
                  Hold to hover; land to refuel
                </dd>
              </div>
              <div>
                <dt>Dive</dt>
                <dd>S / ↓</dd>
              </div>
              <div>
                <dt>Back / front + nitro</dt>
                <dd>A / ← · D / →</dd>
              </div>
              <div>
                <dt>Golden Seed Cannon</dt>
                <dd>
                  Auto-fire · click or tap to aim
                  <br />F resets aim forward
                </dd>
              </div>
              <div>
                <dt>Mega Cheese Bomb</dt>
                <dd>E · 8s recharge</dd>
              </div>
              <div>
                <dt>Wheel Lightning Storm</dt>
                <dd>Q · 12s recharge</dd>
              </div>
              <div>
                <dt>Pause / resume</dt>
                <dd>P / Escape</dd>
              </div>
            </dl>
            <p className="dialog-note">
              Live Wheel Turbo activates at 1.35× with three seeds per shot when
              Squeektoshi’s wheel reports fresh SPINNING telemetry. IDLE or
              stale data puts it on standby. Nitro and turbo stack. You can play
              offline.
            </p>
            <p className="dialog-note">
              Sound is optional. Leaving the tab pauses play. Reduced motion
              removes decorative effects; essential game movement continues and
              can be paused.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setDialog(null)}
            >
              Ready to ride <Icon name="check" size={17} />
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
