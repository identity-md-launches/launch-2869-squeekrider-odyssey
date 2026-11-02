import { useCallback, useEffect, useRef, useState } from "react";
import {
  TRAILS,
  STORAGE_KEY,
  freshGame,
  jump,
  update,
  parseSaved,
  trailFor,
  type Phase,
  type Ride,
  type TrailId,
} from "./game";
import { render } from "./art";
import { Icon, MouseMark } from "./icons";
import { RideAudio } from "./sound";

type ScreenStats = { distance: number; cheese: number; phase: Phase };
const integer = (n: number) => n.toLocaleString("en-US");
const dateLabel = (n: number) =>
  new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(n);

function load() {
  try {
    return {
      ...parseSaved(localStorage.getItem(STORAGE_KEY)),
      available: true,
    };
  } catch {
    return { ...parseSaved(null), available: false };
  }
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
  const [storageAvailable, setStorageAvailable] = useState(initial.available);
  const [trail, setTrail] = useState<TrailId>("valley");
  const [stats, setStats] = useState<ScreenStats>({
    distance: 0,
    cheese: 0,
    phase: "ready",
  });
  const [sound, setSound] = useState(initial.sound);
  const [dialog, setDialog] = useState<"help" | "clear" | null>(null);
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<TrailId | "all">("all");
  const [sort, setSort] = useState<"recent" | "best">("recent");
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [lastRide, setLastRide] = useState<Ride | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogOpener = useRef<HTMLElement | null>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);
  const game = useRef(freshGame("valley"));
  const audio = useRef(new RideAudio());
  const soundRef = useRef(sound);
  const dialogOpen = useRef(false);
  const savedRide = useRef(false);
  const phase = stats.phase;
  const locked = phase === "riding" || phase === "paused";
  const activeTrail = trailFor(trail);
  const filtered = rides
    .filter((r) => filter === "all" || r.trail === filter)
    .sort((a, b) =>
      sort === "best"
        ? b.distance - a.distance || b.date - a.date
        : b.date - a.date,
    );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ rides, sound, best }));
    } catch {
      setStorageAvailable(false);
    }
  }, [rides, sound, best]);

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
    setLastRide(ride);
    setRides((previous) => [ride, ...previous].slice(0, 20));
    setBest((previous) => Math.max(previous, ride.distance));
    setNotice(
      `Ride complete. ${integer(ride.distance)} meters and ${ride.cheese} cheese collected.`,
    );
  }, []);

  const pause = useCallback(() => {
    const g = game.current;
    if (g.phase !== "riding") return;
    g.phase = "paused";
    setStats({
      distance: Math.floor(g.distance),
      cheese: g.cheese,
      phase: g.phase,
    });
    setNotice("Ride paused. Resume whenever you are ready.");
  }, []);

  const resume = useCallback(() => {
    if (game.current.phase !== "paused") return;
    game.current.phase = "riding";
    setStats((s) => ({ ...s, phase: "riding" }));
    setNotice("Back on the trail.");
    canvasRef.current?.focus({ preventScroll: true });
  }, []);

  const start = useCallback(() => {
    const old = game.current;
    game.current = freshGame(
      old.trail,
      old.width,
      old.height,
      crypto.getRandomValues(new Uint32Array(1))[0],
    );
    game.current.phase = "riding";
    savedRide.current = false;
    setLastRide(null);
    setStats({ distance: 0, cheese: 0, phase: "riding" });
    setNotice("Ride started. Jump over rocks and cacti.");
    canvasRef.current?.focus({ preventScroll: true });
    if (soundRef.current) void audio.current.enable();
  }, []);

  const doJump = useCallback(() => {
    if (jump(game.current)) audio.current.play("jump");
  }, []);

  const chooseTrail = (id: TrailId) => {
    if (locked) return;
    const g = game.current;
    game.current = freshGame(id, g.width, g.height);
    setTrail(id);
    setLastRide(null);
    setStats({ distance: 0, cheese: 0, phase: "ready" });
    setNotice(`${trailFor(id).name} selected. Ready to ride.`);
  };

  const toggleSound = async () => {
    if (sound) {
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
        "Sound is unavailable in this browser. You can keep riding without it.",
      );
  };

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const r = c.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio || 1, 2);
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
      game.current.width = (r.width / r.height) * 440;
      game.current.height = 440;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(c);
    resize();
    let raf = 0,
      previous = 0,
      lastSync = 0;
    const draw = (now: number) => {
      const g = game.current;
      update(g, previous ? (now - previous) / 1000 : 0);
      previous = now;
      if (g.lastEvent === "cheese" || g.lastEvent === "crash")
        audio.current.play(g.lastEvent);
      g.lastEvent = null;
      if (g.phase === "finished" && !savedRide.current) finish();
      if (now - lastSync > 80 || g.phase === "finished") {
        setStats((s) => {
          const distance = Math.floor(g.distance);
          return s.phase === g.phase &&
            s.distance === distance &&
            s.cheese === g.cheese
            ? s
            : { distance, cheese: g.cheese, phase: g.phase };
        });
        lastSync = now;
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
  }, [finish, reduced]);

  useEffect(() => {
    const keys = (e: KeyboardEvent) => {
      if (dialogOpen.current || e.altKey || e.ctrlKey || e.metaKey || e.repeat)
        return;
      const target = e.target as HTMLElement;
      if (target.closest("a, select, input, dialog")) return;
      if (!target.closest(".game-shell") && target !== document.body) return;
      if (e.code === "KeyP" || e.code === "Escape") {
        e.preventDefault();
        if (game.current.phase === "riding") pause();
        else if (game.current.phase === "paused") resume();
        return;
      }
      if (target.closest("button")) return;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (game.current.phase === "riding") doJump();
        else if (
          game.current.phase === "ready" ||
          game.current.phase === "finished"
        )
          start();
      }
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    addEventListener("keydown", keys);
    addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      removeEventListener("keydown", keys);
      removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [doJump, pause, resume, start]);

  useEffect(() => {
    if (phase === "finished") startRef.current?.focus({ preventScroll: true });
    if (phase === "paused") resumeRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    dialogOpen.current = dialog !== null;
    if (dialog && !dialogRef.current?.open) dialogRef.current?.showModal();
    if (!dialog && dialogRef.current?.open) {
      dialogRef.current.close();
      queueMicrotask(() => {
        if (dialogOpener.current?.isConnected)
          dialogOpener.current.focus({ preventScroll: true });
      });
    }
  }, [dialog]);

  const openDialog = (kind: "help" | "clear") => {
    dialogOpener.current = document.activeElement as HTMLElement;
    if (kind === "help") pause();
    setDialog(kind);
  };
  const openHelp = () => openDialog("help");
  const downloadLog = () => {
    const content = [
      "Trail,Distance (m),Cheese,Date (UTC)",
      ...rides.map(
        (r) =>
          `${trailFor(r.trail).name},${r.distance},${r.cheese},${new Date(r.date).toISOString()}`,
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "squeekrider-ride-log.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Ride log downloaded as CSV.");
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
          aria-label="Squeekrider Odyssey, back to the ride"
        >
          <MouseMark />
          <span>
            Squeekrider<span className="brand-sub">Odyssey</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <a className="nav-ride" href="#ride">
            The ride
          </a>
          <a href="#field-guide">Field guide</a>
          <a href="#ride-log">Ride log</a>
        </nav>
        <div className="header-tools">
          <button
            type="button"
            className="icon-button"
            onClick={() => void toggleSound()}
            aria-label={sound ? "Turn sound off" : "Turn sound on"}
            aria-pressed={sound}
            title={sound ? "Sound on" : "Sound off"}
          >
            <Icon name={sound ? "sound" : "mute"} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={openHelp}
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
                Small rider. <span>Big adventure.</span>
              </h1>
              <p>A little mouse, a trusty bike, and the long way home.</p>
            </div>
            <div className="personal-best">
              <Icon name="trophy" size={22} />
              <span>
                Personal best
                <strong>
                  {integer(best)} <span>m</span>
                </strong>
              </span>
            </div>
          </div>

          <div className={`game-shell phase-${phase} trail-${trail}`}>
            <div className="game-stage">
              <canvas
                ref={canvasRef}
                tabIndex={0}
                role="application"
                aria-label="Squeekrider riding game"
                aria-describedby="game-directions"
                onPointerDown={(e) => {
                  if (game.current.phase === "riding") {
                    e.preventDefault();
                    canvasRef.current?.focus({ preventScroll: true });
                    doJump();
                  }
                }}
              />
              <div className="scene-top">
                <span
                  className={`location ${trail === "moon" ? "location-night" : ""}`}
                >
                  <Icon name={trail === "moon" ? "moon" : "sun"} size={18} />
                  <span>{activeTrail.name}</span>
                </span>
                <div className="hud" aria-label="Current ride">
                  <span className="distance">
                    <strong>{integer(stats.distance)}</strong> m
                  </span>
                  <span className="cheese-count">
                    <Icon name="cheese" size={19} />
                    <strong>{integer(stats.cheese)}</strong>
                  </span>
                  <button
                    type="button"
                    className="scene-pause icon-button"
                    onClick={pause}
                    disabled={phase !== "riding"}
                    aria-label="Pause ride"
                  >
                    <Icon name="pause" size={18} />
                  </button>
                </div>
              </div>
              {phase === "ready" && (
                <div className="start-overlay">
                  <span className="intro-note">A small escape awaits.</span>
                  <button
                    ref={startRef}
                    type="button"
                    className="primary-button start-button"
                    onClick={start}
                  >
                    <Icon name="play" size={19} />
                    Start riding
                  </button>
                </div>
              )}
              {phase === "paused" && (
                <div className="state-scrim">
                  <div className="state-content">
                    <Icon name="pause" size={28} />
                    <h2>A little breather.</h2>
                    <p>The desert can wait.</p>
                    <button
                      ref={resumeRef}
                      type="button"
                      className="primary-button"
                      onClick={resume}
                    >
                      <Icon name="play" size={18} />
                      Resume ride
                    </button>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => {
                        game.current.phase = "finished";
                        finish();
                        setStats((s) => ({ ...s, phase: "finished" }));
                      }}
                    >
                      Finish this ride
                    </button>
                  </div>
                </div>
              )}
              {phase === "finished" && (
                <div className="state-scrim">
                  <div className="state-content result-content">
                    <Icon name="flag" size={28} />
                    <h2>A good little ride.</h2>
                    <p>
                      {integer(lastRide?.distance ?? stats.distance)} meters of
                      adventure.
                    </p>
                    <div className="result-cheese">
                      <Icon name="cheese" size={18} />
                      {lastRide?.cheese ?? stats.cheese} cheese collected
                    </div>
                    <button
                      ref={startRef}
                      type="button"
                      className="primary-button"
                      onClick={start}
                    >
                      <Icon name="reset" size={18} />
                      Ride again
                    </button>
                    <a className="text-button" href="#trails">
                      Try another trail
                      <Icon name="arrow" size={17} />
                    </a>
                  </div>
                </div>
              )}
              <span
                className={`scene-signature ${trail === "moon" ? "signature-night" : ""}`}
                aria-hidden="true"
              >
                Take the scenic route.
              </span>
            </div>
            <div className="game-controls">
              <p id="game-directions">
                <span className="desktop-directions">
                  <kbd>Space</kbd> or <kbd>↑</kbd> to jump
                  <span className="instruction-divider">/</span>
                </span>
                <span className="touch-directions">Tap the trail to jump.</span>
                <span className="double-hint">Twice for a double jump.</span>
              </p>
              <button
                type="button"
                className="jump-button"
                onClick={doJump}
                disabled={phase !== "riding"}
              >
                <Icon name="jump" size={17} />
                Jump
              </button>
            </div>
          </div>
          <div className="game-footnote">
            <span>
              <span className="status-dot" />
              Free to play. Made for a moment away.
            </span>
            <span>
              {storageAvailable
                ? "Records stay in this browser."
                : "Storage unavailable. Records last this visit."}
            </span>
          </div>
        </section>

        <section
          id="trails"
          className="trails-section"
          aria-labelledby="trails-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="trails-title">Pick your kind of nowhere.</h2>
              <p>
                {locked
                  ? "Finish your ride to change trails."
                  : "Three trails. A different little feeling on each."}
              </p>
            </div>
            <span className="section-number" aria-hidden="true">
              01 / Explore
            </span>
          </div>
          <div className="trail-grid">
            {TRAILS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                className={`trail-card ${trail === t.id ? "selected" : ""}`}
                aria-pressed={trail === t.id}
                aria-label={`Select ${t.name}, ${t.difficulty}`}
                disabled={locked}
                onClick={() => chooseTrail(t.id)}
              >
                <div className="trail-image">
                  <TrailArt trail={t.id} />
                  <span className="trail-number">0{i + 1}</span>
                  {trail === t.id && (
                    <span className="selected-mark">
                      <Icon name="check" size={15} />
                      <span>Selected</span>
                    </span>
                  )}
                </div>
                <div className="trail-details">
                  <div className="trail-title-row">
                    <h3>{t.name}</h3>
                    <Icon name="arrow" size={19} />
                  </div>
                  <p>{t.subtitle}</p>
                  <span className="trail-difficulty">
                    <span
                      className={`difficulty-dots level-${i}`}
                      aria-hidden="true"
                    >
                      <i />
                      <i />
                      <i />
                    </span>
                    {t.difficulty}
                  </span>
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
          <div className="guide-intro">
            <span className="guide-sketch" aria-hidden="true">
              <Icon name="mountain" size={58} />
            </span>
            <h2 id="guide-title">A pocket field guide.</h2>
            <p>A few tips for the trail.</p>
          </div>
          <div className="guide-items">
            <div>
              <span className="guide-icon">
                <Icon name="jump" size={23} />
              </span>
              <div>
                <h3>Find your rhythm</h3>
                <p>
                  Jump over rocks and cacti. Tap the trail, press Space, or use
                  the Jump button. Jump again in the air to go higher.
                </p>
              </div>
            </div>
            <div>
              <span className="guide-icon">
                <Icon name="cheese" size={24} />
              </span>
              <div>
                <h3>Pack a little snack</h3>
                <p>
                  Collect cheese along the way. It is a snack count, not extra
                  distance. The further you ride, the faster the trail gets.
                </p>
              </div>
            </div>
            <div>
              <span className="guide-icon">
                <Icon name="pause" size={22} />
              </span>
              <div>
                <h3>Take it at your pace</h3>
                <p>
                  Press P or use pause for a breather. Leaving the tab pauses
                  your ride, too. Your latest 20 rides stay in this browser.
                </p>
              </div>
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
              <h2 id="log-title">Every little journey counts.</h2>
              <p>
                Your latest 20 rides, saved{" "}
                {storageAvailable
                  ? "only in this browser"
                  : "for this visit only"}
                .
              </p>
            </div>
            <span className="section-number" aria-hidden="true">
              02 / Remember
            </span>
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
                    <option key={t.id} value={t.id}>
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
                onClick={downloadLog}
                disabled={!rides.length}
              >
                <Icon name="download" size={18} />
                Export log
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Clear ride log"
                title="Clear ride log"
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
                  {filter === "all" ? "All trails" : trailFor(filter).name} ride
                  history, sorted by {sort === "recent" ? "latest" : "longest"}{" "}
                  ride
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Trail</th>
                    <th scope="col">Distance</th>
                    <th scope="col">Cheese</th>
                    <th scope="col">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <span className="log-trail-icon">
                          <Icon
                            name={r.trail === "moon" ? "moon" : "sun"}
                            size={17}
                          />
                        </span>
                        {trailFor(r.trail).name}
                      </td>
                      <td>{integer(r.distance)} m</td>
                      <td>{integer(r.cheese)}</td>
                      <td>
                        <time dateTime={new Date(r.date).toISOString()}>
                          {dateLabel(r.date)}
                        </time>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="log-empty">
              <span className="empty-icon">
                <Icon name={rides.length ? "mountain" : "flag"} size={28} />
              </span>
              <div>
                <h3>
                  {rides.length
                    ? "This trail is still calling."
                    : "Your story starts with a ride."}
                </h3>
                <p>
                  {rides.length
                    ? "No rides on this trail yet. Choose another trail filter to see your log."
                    : "A few meters or a new personal best. It all belongs here."}
                </p>
              </div>
              <a href="#ride" className="text-button">
                Back to the ride
                <Icon name="arrow" size={18} />
              </a>
            </div>
          )}
        </section>
      </main>
      <footer className="site-footer page-width">
        <a className="footer-brand" href="#ride">
          <MouseMark />
          <span>Squeekrider Odyssey</span>
        </a>
        <span>A small game for a wide world.</span>
        <button type="button" className="text-button" onClick={openHelp}>
          How to play
          <Icon name="arrow" size={17} />
        </button>
      </footer>
      <p className="sr-only" role="status" aria-live="polite">
        {notice}
      </p>

      <dialog
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const controls = e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], select:not(:disabled), [tabindex="0"]',
          );
          const first = controls[0],
            last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
          if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
        ref={dialogRef}
        onCancel={() => setDialog(null)}
        onClose={() => setDialog(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            const r = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < r.left ||
              e.clientX > r.right ||
              e.clientY < r.top ||
              e.clientY > r.bottom
            )
              setDialog(null);
          }
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-header">
          <h2 id="dialog-title">
            {dialog === "clear" ? "Clear your ride log?" : "A little know-how."}
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
              This removes your saved rides and personal best from this browser.
              Export your log first if you want to keep it.
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setDialog(null)}
              >
                Keep my rides
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setRides([]);
                  setBest(0);
                  setLastRide(null);
                  setDialog(null);
                  setNotice("Ride log cleared. Your next adventure is ready.");
                }}
              >
                Clear ride log
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              Help Pip ride a little further. Avoid rocks and cacti, and collect
              cheese for the road.
            </p>
            <dl className="shortcuts">
              <div>
                <dt>Jump</dt>
                <dd>
                  <kbd>Space</kbd> / <kbd>↑</kbd> / tap the trail
                </dd>
              </div>
              <div>
                <dt>Double jump</dt>
                <dd>Jump again while in the air</dd>
              </div>
              <div>
                <dt>Pause / resume</dt>
                <dd>
                  <kbd>P</kbd> or <kbd>Esc</kbd>
                </dd>
              </div>
            </dl>
            <p className="dialog-note">
              Sound is optional. Records stay on this device. The ride pauses
              when you leave the tab. Reduced motion removes dust and scarf
              movement; the trail still moves during play.
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => setDialog(null)}
            >
              Got it
              <Icon name="check" size={18} />
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
