# SqueekRider Odyssey

A colorful wheel-bike action runner and boss shooter. Fly Pip through three desert trails, collect Cheese Coins, upgrade the royal bike, and fight Baron Von Claw’s Clockwork Cat-Blimp. The HUD reads Squeektoshi’s wheel directly from Squeekchain.

## Install, preview, rebuild

Use Node.js 22.12+ and npm. The existing dependency manifest and lockfile are unchanged.

```sh
npm ci
npm run dev
```

To check and rebuild the production export:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Open the address printed by Vite. `dist/` is the complete static export and is included alongside the source and lockfile. Vite’s existing `base: './'` makes scripts, styles, fonts, favicon and share image work at a static gateway subpath. Navigation uses hashes. Serve `dist/` over HTTP or HTTPS; a `file:` URL is not supported. Hosting/publication is handled separately.

## Controls and combat

| Action | Keyboard | Pointer / touch |
| --- | --- | --- |
| Jump / fly / hover | W, Up Arrow or Space; hold to hover | Hold Fly; release and tap for another jump |
| Fast dive | S or Down Arrow | Hold Dive |
| Retreat | A or Left Arrow | Hold Back |
| Advance + 1.55× nitro | D or Right Arrow | Hold Nitro |
| Golden Seed Cannon | Automatically fires; F resets aim forward | Click or tap the scene to aim and fire; mouse movement also aims |
| Mega Cheese Bomb | E, 8s recharge | Cheese Bomb button |
| Wheel Lightning Storm | Q, 12s recharge | Wheel Storm button |
| Pause / resume | P or Escape | Pause / Resume ride |

Start with two jumps, 100 HP and 10 damage per seed. Thruster fuel refills on the ground. Hazards deal 25 damage with a short invulnerability window. Destroying a cart or goblin awards 5 coins; collecting a cheese pickup awards 1. The boss arrives at 600 m. **Boss Rush** starts that fight immediately from the ready/results screen without awarding artificial distance. Defeating the Baron awards 60 coins and finishes the run.

On a narrow screen, starting or resuming scrolls the game into view so the scene and touch weapons fit together. Opening help, opening the garage, buying an upgrade, hiding the tab or leaving the window pauses play. Resume explicitly. Finish a paused run to change trails or start another Boss Rush.

## Live Squeekchain telemetry

The browser performs independent GET requests immediately and every 15 seconds to:

- [Squeekchain status](https://api.squeekchain.com/v1/status): `measurement.coreStatus`, `measurement.rpmMilli`, `builder.anchor.blockHeight`.
- [Squeekchain economy](https://api.squeekchain.com/v1/economy/state): `totalSettlements` (also accepts the same field under `settlements`).

The speedometer’s km/h value is **game bike speed**. `rpmMilli` is displayed separately in its original API units; it is not presented as ordinary RPM. Large integer fields retain precision.

**Live Wheel Turbo** starts armed. With fresh, online `SPINNING` telemetry and positive `rpmMilli`, it grants 1.35× bike speed and a three-way spread cannon. It stacks multiplicatively with nitro (2.0925× combined). `IDLE`, missing, failed or stale telemetry puts turbo on standby; ordinary play and nitro keep working. Requests time out after 8 seconds. Failed requests preserve last-known readings, label the connection, and retry on the normal interval; **Refresh data** retries immediately.

Live checks on 2026-11-02 returned HTTP 200 for both endpoints with browser CORS access. The wheel reported `IDLE`, `rpmMilli: 0`, and anchor block `6808`. The economy response did **not** contain `totalSettlements`. The HUD therefore shows **Unavailable**, with an explanation; it never substitutes rounds, blocks or token balances. The production site contains no fabricated live feed or fallback numbers. API availability and its schema remain external dependencies.

## Royal Bike Garage and records

Each upgrade costs 40 collected coins, per level, up to level 5:

- **Golden Seed Cannon:** 10 / 16 / 22 / 28 / 34 damage per seed.
- **Jetpack & jumps:** 2–6 jumps, greater lift and maneuvering speed, and 2.0–3.2 seconds of hover fuel.
- **Max HP armor:** 100 / 125 / 150 / 175 / 200 HP. Buying armor also adds the gained HP to the current run.

Every three purchased levels raises the character rank. All three upgrades at level 5 earn **Level 5 Supreme Wheel Monarch**. Coins are banked as they are earned, including ability and boss rewards; upgrades pause the run and apply immediately.

Garage coins/levels use local storage key `squeekrider-royal-garage-v2`. The existing `squeekrider-odyssey-v1` key retains the latest 20 completed rides, personal best and sound preference. Old ride history remains readable. Filter by trail, sort, export CSV or clear the log after confirmation. Clearing the log preserves garage progress. Invalid storage is discarded safely; blocked storage produces a visible “this visit” explanation. These are local game records, not a shared leaderboard or on-chain tokens. There are no wallets, transactions, accounts or analytics.

Sound is opt-in and uses native Web Audio synth effects for jumps, firing, collecting, upgrading, damage, lightning and explosions. The sound control also mutes them. No audio files are downloaded.

## Validation actually performed

Dependencies were installed with the unchanged lockfile in a temporary build directory outside the repository. The final source, assets and tests were copied there for the package scripts; its production export was copied into `dist/`. No dependency/cache directory or new ignore rule is included.

| Check | Result |
| --- | --- |
| Clean `npm ci` | Passed, existing lockfile |
| `npm run typecheck` | Passed |
| `npm test` | 22 passed, including 200 seeded simulations |
| `npm run build` | Passed, 34 modules |
| Production interaction suite | 15 groups passed, Chromium and WebKit |
| Pinned taste@1 design probe | 16/16 passed, 320 / 390 / 1440 px |
| axe-core 4.10.3 | No violations in ready, help, open/closed garage and reduced-motion states |
| Responsive overflow checks | Passed at 320, 390, 600, 820, 1024 and 1440 px |
| Live API checks | Both endpoints HTTP 200; actual readings displayed in Chromium |

Run the included browser suite with Playwright installed normally in a separate tools directory, or with an existing installation:

```sh
# Point these variables to your own installed tools when needed.
export IMD_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs
export PLAYWRIGHT_BROWSERS_PATH=/absolute/path/to/browser-binaries
export AXE_SCRIPT=/absolute/path/to/axe-core/axe.min.js
node scripts/validate-browser.mjs
```

`AXE_SCRIPT` is optional. `IMD_WEBKIT_EXECUTABLE` can name a local WebKit launcher when its runtime libraries need a wrapper. These tools are not production dependencies. The suite serves `dist/` at `/preview/` in a bounded foreground process and closes its server/browsers. API fixtures test spinning, idle, missing, stale, failure and recovery behavior; they are confined to tests. Polling is checked with a browser clock, without a real 15-second wait. Output under `test/scratch/` is disposable. `scripts/validate-revision.mjs` forwards to the current suite.

The supplied probe was run from the repository root as:

```sh
node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline
```

Its pinned input is removed by the assignment runner after submission. Current results and selected screenshots are retained in `docs/review/odyssey-action/`; the other `docs/review/` files document the previous release. See [VALIDATION.md](VALIDATION.md) for six-domain coverage, repaired findings and limitations, and [DESIGN.md](DESIGN.md) for the implemented design system.

## Limits and credits

Physical iOS/Android devices, native browser zoom, screen-reader sessions and listening to the generated sound were not performed. WebKit gameplay used controlled API fixtures; live network/CORS verification was in Chromium. WebKit initially lacked runtime libraries; temporary libraries and a launcher outside the repository enabled its successful checks. The canvas game is visual and does not offer a full nonvisual equivalent. Reduced motion removes decorative parallax, particles, speed streaks, lightning/bomb flashes, scarf/wheel motion and UI transitions; essential gameplay continues only after starting and can be paused. Automated accessibility checks do not establish full accessibility compliance.

`src/App.tsx` owns UI and lifecycle; `src/game.ts` contains simulation and persistence validation; `src/telemetry.ts` contains parsing/polling; `src/art.ts` draws local original art; `src/sound.ts` synthesizes effects. Existing Bricolage Grotesque and DM Sans fonts are bundled under the SIL Open Font License; React/React DOM retain MIT notices in `public/licenses/` and `dist/licenses/`. Better Interface and Impeccable design/documentation notices remain in `third_party/Design-reference-LICENSE.txt`.
