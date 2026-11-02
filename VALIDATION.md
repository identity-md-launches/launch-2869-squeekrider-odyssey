# Validation and design review

Worker validation of the updated static export, 2026-11-02. This records local evidence, not independent certification.

| Area | Final result |
| --- | --- |
| Requested game features | Implemented; external missing settlement field handled explicitly |
| Missing / fabricated features | None intentionally substituted; no fabricated live data |
| Product and main action on first 390px screen | Yes, observed screenshot and bounding-box assertion |
| Production build / TypeScript | Passed / passed |
| Engine and telemetry tests | 22 passed |
| Browser interaction groups | 15 passed; see `docs/review/odyssey-action/browser-results.json` |
| taste@1 | 16 / 16 passed |
| Share metadata and image | Present; local 1200×630 PNG |

## Scope and assumptions

The existing Vite/React/TypeScript game was upgraded in place. Pip, three trails, local fonts, saved v1 rides, CSV export, filtering, sorting and confirmed clearing remain. New simulation, live telemetry, royal upgrades, enemies, boss fights and synth effects run entirely in the static browser application. No wallet, contract deployment, token operation or backend was added.

Turbo is an armed setting: fresh online `SPINNING` status with positive `rpmMilli` powers its 1.35× speed and three-way spread; idle/stale/error data leaves it on standby. The 1.55× directional nitro remains available independently, and both multipliers stack. Each of the three upgrade tracks starts at level 1, costs 40 coins per increment and caps at 5; each three purchased levels raises the rank to a maximum of Supreme Wheel Monarch. Boss Rush begins the boss immediately at actual distance zero.

The status and economy endpoints both returned HTTP 200, with `access-control-allow-origin: *`, in direct checks and actual Chromium requests. Observed status was `IDLE`, `rpmMilli: 0`, anchor `6808`. The economy response lacked `totalSettlements`; unavailable text is the correct observed state. This is an external API/schema limitation, not a request for a guessed value. Settlements are not inferred from round numbers or funded blocks.

## Commands and actual results

Because the repository’s manifests/dependencies were protected, `package.json` and `package-lock.json` were copied unchanged to an isolated temporary build directory. `npm ci --no-audit --no-fund` installed 22 packages there. Source, public assets, TypeScript/Vite configuration and tests were copied there for validation. No dependency installation was made in the repository.

| Command | Actual outcome |
| --- | --- |
| `npm run typecheck` | Exit 0, `tsc --noEmit`, no errors |
| `npm test` | Exit 0; 22 passed, 0 failed; includes 200 seeded simulations |
| `npm run build` | Exit 0; Vite 7.1.12, 34 modules; complete export copied to `dist/` |
| `node scripts/validate-browser.mjs` | Production export served at `/preview/`; results retained in `docs/review/odyssey-action/browser-results.json` |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline` | Exit 0; all 16 checks passed at 320, 390 and 1440px, plus reduced motion |

Playwright and axe-core were installed/used outside the repository. `IMD_PLAYWRIGHT`, `PLAYWRIGHT_BROWSERS_PATH` and `AXE_SCRIPT` pointed to those tools. WebKit 2370 initially lacked libraries, then lacked an EGL display. Libraries and a software-rendering launcher kept in temporary storage enabled the successful WebKit interaction check through `IMD_WEBKIT_EXECUTABLE`; no browser binaries, system libraries, package archives or launcher paths are part of the delivered source/export.

## Requirement coverage

| Brief requirement | Implementation and evidence |
| --- | --- |
| Poll both GET endpoints every 15s | `src/telemetry.ts:98`; immediate independent requests, 15,000ms interval, timeout/cleanup; unit watcher and browser-clock polling checks |
| Live HUD: coreStatus, rpmMilli, anchor blockHeight, totalSettlements | Live speedometer and four fields in `src/App.tsx`; precision-preserving parsers; real API inspection and missing-field test |
| Live Wheel Turbo, 1.35× and three-way cannon | `turboAvailable`, `bikeSpeed`, `fire`; idle/spinning/stale/error/toggle tests; raw telemetry never simulated in production |
| Up/W/Space, multi-jump, hover | `jump`, upward input and fuel; engine and actual keyboard/touch checks |
| Down/S fast dive | Downward input and increased fall velocity; physics and browser control checks |
| Right/D front + 1.55× nitro | Horizontal input and independent multiplier; key-down/key-up speed/label checks |
| Left/A retreat | Horizontal input; engine positional checks and browser input |
| Automatic/click-aimed Golden Seed Cannon | Auto-shot timer, `fire`, pointer mapping; collision/reward tests and pointer aim interaction |
| E Mega Cheese Bomb / Q Wheel Lightning Storm | `special`; area clearing, boss damage, separate 8s/12s cooldowns; keyboard/button checks |
| Garage: coins, 40/level, cannon/jetpack/armor, Level 5 rank | `buyUpgrade`, profile parser, immediate paused application; purchase/cap/persistence/rank tests |
| Rolling spiked carts, flying rocket goblins | Deterministic spawns, drawn enemies, contact damage and goblin projectiles; collision/hit tests and actual gameplay |
| 600m boss and instant Boss Rush | `summonBoss`, distance trigger, rush path, visible boss health; trigger unit test and production boss defeat |
| Web Audio synth effects and mute | Native oscillator effects for all named actions; browser counts generated oscillators and verifies mute stops new effects |
| Responsive useful website | Screenshots, no-overflow assertions at six widths, phone auto-scroll into play, keyboard and touch controls |
| Static export/source/lockfile | Complete `dist/`, relative Vite assets, local fonts/art/share image; unchanged original manifest and lockfile |
| Title/favicon/description/og:title/og:image | `index.html`, `public/favicon.svg`, updated local share PNG; taste share check passed |
| Implemented design and install/rebuild documentation | Root `DESIGN.md`, `README.md`; this review and selected evidence under `docs/review/odyssey-action/` |

## Six-domain Better Interface review

The pinned workflow and core principles of accessibility, layout, writing, typography, colors and UI were read and applied during implementation. The review preserves the request’s colorful action-game direction and the existing Pip/trail identity.

| Domain | Coverage | Evidence and limits |
| --- | --- | --- |
| Accessibility | Checked | Native buttons, checkbox, progress, selects, dialog and table; names/roles; keyboard movement/activation; modal trap/Escape/focus return; touch targets; reduced motion; axe scans. No screen-reader or complete nonvisual gameplay test. |
| Layout | Checked | First screen at 390, main-action bounds, full scenes and garage; 320/390/600/820/1024/1440 no horizontal overflow; game controls fit after start/resume; desktop and mobile screenshots. Native 200% zoom, translation and RTL unperformed. |
| Writing | Checked | Specific action labels; costs/current benefits; local persistence explained; loading vs unavailable-field vs network-failure states; idle/armed/active turbo wording; redundant slogans removed. |
| Typography | Checked | Two existing local variable fonts observed loaded; six-size scale, three weights, tabular numbers, wrap behavior and no clipped data. Screenshot inspection at 320, 390 and 1440; no language variants. |
| Colors | Checked | Hex role tokens; contrast probe passes resolved solid pairs. Computed measurements: secondary `#c4bbce` on page `#171522` = 9.72:1, on surface `#211e32` = 8.75:1; primary `#171522` on gold `#ffd16d` = 12.51:1. Canvas/gradient/image text pairs excluded by the probe remain unmeasured; no blanket contrast-compliance claim. |
| UI | Checked | Ready/riding/paused/loss/win, turbo states, available/recharging specials, garage normal/insufficient/capped states, saved/empty/filtered log, confirmations, mute, error/recovery. Named 120ms transitions, 0.96 press scale, reduced-motion guards. Animation-panel playback at 10% and physical-device behavior unperformed. |

Themes and localization are not requested; the fixed dark UI and three game palettes are intentional. Uppercase `SPINNING`/`IDLE` are required API values rather than decorative capitalized copy.

## Findings repaired

All 15 browser groups and five axe-scanned states (ready, help, open garage, closed garage and reduced motion) passed.

Source citations identify the final implementation at the repaired location. Earlier behavior is described separately.

1. **High · layout/UI: health panel covered the rider.** At 390px during play, the original vertical health/fuel panel occupied Pip’s body. Reproduction: start a ride, jump, view the lower-left scene. The final `.armor-hud` rules at `src/styles.css:1902` place a short horizontal panel in the track gutter. Drive status moved below the top HUD and yields to the boss bar. Rechecked in the mobile playing screenshot; rider, floor and meters are distinct.
2. **Medium · layout: ready overlay obscured the artwork.** The first 390px inspection showed an opaque start panel over Pip’s head. `src/styles.css:407` / `src/App.tsx` ready overlay now leave the primary action over open landscape, removing the duplicate headline/body panel. Initial ready screenshots show the complete rider and action together.
3. **Medium · writing: repeated two-beat slogans.** The first taste run passed 15/16, flagging eight slogan-like lines. Trail descriptions in `src/game.ts` and ready/section copy in `src/App.tsx` were changed to plain descriptions/directions. The main “Small rider. Royal firepower.” line remains. Final taste slogans check passes.
4. **Medium · accessibility: decorative pips had prohibited ARIA labels.** Initial axe scans reported `aria-prohibited-attr` on all three generic pip containers. `src/App.tsx:1148` marks them `aria-hidden`; the visible level text already carries the information. Rechecked by axe in the ready and fully upgraded garage states with zero violations.
5. **Medium · writing/data: pending and failed requests overstated what was known.** Source review found the economy’s initial loading phase could appear partial/stale and a failed request could display the missing-field explanation without a valid response. `src/App.tsx:267` now considers both pending requests; `src/App.tsx:1053` gates the missing-field message on actual parsed data and gives network failure a retry message. Browser offline/malformed/service-error/recovery checks pass; an offline response does not claim a missing settlement field.
6. **High · interaction: ability rewards needed immediate banking.** Reviewing the lifecycle found that abilities can add cheese outside the animation update, bypassing an animation-frame-only coin delta. `src/App.tsx:389` now banks the ability’s earned delta immediately; frame rewards remain handled in the animation loop. Unit ability rewards and the production banking check verify the saved coins; no upgrade cost/rank rules changed.

7. **Low · accessibility: sound action carried a redundant pressed state.** `src/App.tsx:660` uses changing Enable sound / Mute sound action names. The redundant `aria-pressed` was removed so the action label cannot be read as an inverted mute state. The native button retains keyboard activation; the final sound/mute browser check passes.

Two initial browser-suite failures were test assumptions, not product defects: the page intentionally has 24px scroll padding, and help appears in both header and footer. Bounds and selectors were corrected. WebKit HUD synchronization waits for the rendered label instead of assuming a 150ms frame deadline.

## Evidence

Current machine-readable outcomes: `docs/review/odyssey-action/browser-results.json`, `docs/review/odyssey-action/taste-results.json`, `docs/review/odyssey-action/bundle-report.json`. Selected screenshots: `docs/review/odyssey-action/mobile-ready.png`, `docs/review/odyssey-action/mobile-playing.png`, `docs/review/odyssey-action/desktop-ready.png`, `docs/review/odyssey-action/garage-monarch.png`, `docs/review/odyssey-action/webkit-mobile.png` and `docs/review/odyssey-action/live-mobile.png`. Controlled screenshots use explicit API/game-save test fixtures; `live-mobile.png` uses the real API. The source share card is `public/share.png`, copied by the build to `dist/share.png`.

The browser checks exercise starting/retrying, four directions, nitro release, hover fuel/dive, touch Fly, aim/reset, pause/resume, E/Q cooldowns, modal focus, finishing/log persistence, CSV content, filters/sort, safe clearing, 15s GET polling, turbo toggle/spinning/idle, stale/failure/recovery, purchases/caps/rank, immediate ability reward banking, boss defeat, native sound nodes/mute, blocked storage and responsive reflow. Engine tests additionally check precise speed multipliers/spread angles, damage/invulnerability, boss threshold, upgrade math, malformed storage, missing API fields, exact integer handling and independent request cleanup.

Actual Chromium live browsing recorded both named API requests returning 200 repeatedly and no console errors. Test fixture failures intentionally abort external requests; they are not production resource failures. All local runtime assets loaded at the `/preview/` subpath, with no local 404s or uncaught script errors. The offline design probe blocks remote requests and still renders the complete game interface.

## Completion and limitations

Complete for the stated scope, with the external settlement-field absence displayed honestly. The worker checks are not an independent network certification.

Not performed: physical-device testing, native screen-reader sessions, native 200% browser zoom, RTL/localized variants, listening to sound, animation-panel inspection at 10% speed, exhaustive pixel contrast over dynamic art. Chromium verified the real API/CORS flow; WebKit gameplay used fixtures because its temporary local runtime lacked normal TLS modules. Automated scans do not establish full accessibility compliance, and the visual canvas has no full nonvisual gameplay equivalent. Local saves can be edited or removed by the visitor. External API availability, stale hardware readings and future schema changes remain external limitations; normal gameplay works without those services.
