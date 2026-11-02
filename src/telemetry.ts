export const STATUS_URL = "https://api.squeekchain.com/v1/status";
export const ECONOMY_URL = "https://api.squeekchain.com/v1/economy/state";
export const POLL_MS = 15_000;
export type Wheel = {
  coreStatus: "SPINNING" | "IDLE";
  rpmMilli: number;
  blockHeight: string | null;
  observedAt: number;
  staleAfterMs: number;
  online: boolean;
};
export type Feed<T> = {
  data: T | null;
  receivedAt: number | null;
  error: string | null;
  loading: boolean;
};
export type Telemetry = {
  status: Feed<Wheel>;
  economy: Feed<{ totalSettlements: string | null }>;
};
type ObjectValue = Record<string, unknown>;
function object(v: unknown): ObjectValue {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as ObjectValue)
    : {};
}
export function integerValue(v: unknown): string | null {
  if (typeof v === "string" && /^\d{1,80}$/.test(v))
    return v.replace(/^0+(?=\d)/, "");
  return typeof v === "number" && Number.isSafeInteger(v) && v >= 0
    ? String(v)
    : null;
}
export function parseStatus(raw: unknown): Wheel {
  const root = object(raw),
    m = object(root.measurement),
    anchor = object(object(root.builder).anchor);
  if (
    (m.coreStatus !== "SPINNING" && m.coreStatus !== "IDLE") ||
    typeof m.rpmMilli !== "number" ||
    !Number.isFinite(m.rpmMilli) ||
    m.rpmMilli < 0
  )
    throw new Error("Wheel response is incomplete");
  const observedAt =
    typeof m.observedAt === "string" ? Date.parse(m.observedAt) : NaN;
  if (!Number.isFinite(observedAt))
    throw new Error("Wheel timestamp is missing");
  return {
    coreStatus: m.coreStatus,
    rpmMilli: m.rpmMilli,
    blockHeight: integerValue(anchor.blockHeight),
    observedAt,
    staleAfterMs:
      typeof m.staleAfterSeconds === "number" && m.staleAfterSeconds > 0
        ? Math.min(m.staleAfterSeconds, 120) * 1000
        : 120_000,
    online: m.freshness === "online",
  };
}
export function parseEconomy(raw: unknown): {
  totalSettlements: string | null;
} {
  const root = object(raw);
  if (!Object.keys(root).length)
    throw new Error("Economy response is incomplete");
  // Do not substitute round numbers, block counts or token balances for settlements.
  return {
    totalSettlements:
      integerValue(root.totalSettlements) ??
      integerValue(object(root.settlements).totalSettlements),
  };
}
export const initialTelemetry = (): Telemetry => ({
  status: { data: null, receivedAt: null, error: null, loading: true },
  economy: { data: null, receivedAt: null, error: null, loading: true },
});
export function wheelFresh(feed: Feed<Wheel>, now: number) {
  return !!(
    feed.data &&
    !feed.error &&
    feed.receivedAt &&
    now - feed.receivedAt < 35_000 &&
    feed.data.online &&
    now - feed.data.observedAt < feed.data.staleAfterMs &&
    feed.data.observedAt - now < 30_000
  );
}
export function turboAvailable(feed: Feed<Wheel>, now: number) {
  return (
    wheelFresh(feed, now) &&
    feed.data!.coreStatus === "SPINNING" &&
    feed.data!.rpmMilli > 0
  );
}
/** Independent requests preserve last-known values; their errors never become game data. */
export function watchTelemetry(
  onChange: (state: Telemetry) => void,
  fetcher: typeof fetch = fetch,
  intervalMs = POLL_MS,
) {
  let state = initialTelemetry(),
    stopped = false;
  const active = new Set<AbortController>();
  const pending = new Set<string>();
  async function request(kind: "status" | "economy") {
    if (pending.has(kind) || stopped) return;
    pending.add(kind);
    const controller = new AbortController();
    active.add(controller);
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetcher(
        kind === "status" ? STATUS_URL : ECONOMY_URL,
        {
          method: "GET",
          mode: "cors",
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const raw: unknown = await response.json();
      const data = kind === "status" ? parseStatus(raw) : parseEconomy(raw);
      if (!stopped) {
        state = {
          ...state,
          [kind]: { data, receivedAt: Date.now(), error: null, loading: false },
        };
        onChange(state);
      }
    } catch {
      if (!stopped) {
        state = {
          ...state,
          [kind]: {
            ...state[kind],
            error: "Connection unavailable",
            loading: false,
          },
        };
        onChange(state);
      }
    } finally {
      clearTimeout(timeout);
      active.delete(controller);
      pending.delete(kind);
    }
  }
  const refresh = () => {
    void request("status");
    void request("economy");
  };
  refresh();
  const timer = setInterval(refresh, intervalMs);
  return {
    refresh,
    stop: () => {
      stopped = true;
      clearInterval(timer);
      active.forEach((c) => c.abort());
    },
  };
}
