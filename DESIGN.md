# SqueekRider Odyssey design system

## Overview

SqueekRider is a browser action runner for keyboard, mouse and touch play. The original Pip mouse, illustrated desert trails, local fonts and ride history remain. The upgrade adds a royal crown, seed cannon, jetpack, mechanical enemies and a Cat-Blimp to the same drawn world.

The visual idea is a tiny crowned rider crossing a colorful clockwork desert. A quiet violet interface frames the game; gold marks the main action and cheese rewards, mint marks the wheel/flight systems, and rose marks the boss. The product precedes supporting information. On a phone, the headline, live HUD, scene and Start riding action are on the first screen. The garage, trails, guide and log follow in normal document flow.

## Colors

Canonical CSS tokens live in `src/styles.css:16`. Values are hex; there is one fixed dark interface, with three separate canvas trail palettes in `TRAILS` (`src/game.ts`).

| Token | Value / primitive | Implemented job |
| --- | --- | --- |
| `--page` | `--night-950`, `#171522` | Page and dark text on the gold primary action |
| `--surface` | `--night-900`, `#211e32` | Game frame, HUD plates, garage upgrades and dialogs |
| `--surface-muted` | `--night-800`, `#2c273f` | Direction and weapon controls, rank mark |
| `--border` | `--night-700`, `#3c3552` | Structural borders, separators, unfilled level pips |
| `--night-600` | `#514966` | Control borders and the off switch track |
| `--text` | `--cream-50`, `#fff5df` | Primary text |
| `--text-secondary` | `--cream-300`, `#c4bbce` | Descriptions, labels, inactive controls and numeric readings |
| `--accent` | `--gold-400`, `#ffd16d` | Primary action, cheese, cannon and rank marks |
| `--accent-hover` | `--gold-300`, `#ffdf97` | Primary action hover |
| `--focus`, `--status` | `--mint-300`, `#86e4cb` | Focus perimeter and live/fresh wheel status |
| `--mint-300` | `#86e4cb` | Turbo switch, thruster/health meters and jetpack category |
| `--rose-300` | `#ffa3ae` | Boss health, unavailable connection dot and armor category |

Each data state also has text: Live, Connecting, Stale / partial, Offline, Active, Armed or Off. Selected trails have a check and Selected text. A colored dot or bar is never the only interface state cue.

The canvas has its own intentional illustration palette. Sunbaked valley uses a violet sky (`#513c89`), gold sun (`#ffcc70`), pink mesas and a mint rail. Cactus pass uses a teal sky (`#2c6878`) and green mesas. Moonlit mesa uses indigo (`#24234e`), a cream moon and lavender rock. Enemy projectiles are rose; player seeds are gold. `src/art.ts` owns illustration-only colors and the sunset gradient, not global UI tokens.

Computed browser measurements include secondary text on page at **9.72:1**, secondary text on the solid surface at **8.75:1**, and primary-button dark text on gold at **12.51:1**. These describe those opaque pairs only. The probe does not measure text against canvas/gradient content; see validation coverage.

## Typography

Reuse the existing local WOFF2 fonts in `src/assets/`: Bricolage Grotesque for headings/brand and DM Sans for body, labels, controls and numbers. Both declare normal variable weights 400–700 and `font-display: swap`. Browser font entries were observed loaded. The implementation uses three weights: 400, 600 and 700. `font-synthesis: none` and root font smoothing are retained.

| Token | Default | Role |
| --- | --- | --- |
| `--text-small` | 14px | Labels, captions, help, HUD and controls |
| `--text-body` | 16px | Intro/supporting prose and native selects |
| `--text-lead` | 18px | Card headings, rank information |
| `--text-title` | 24px | Speed readings, garage headings, dialogs |
| `--text-section` | 32px | Section headings; 24px at ≤600px |
| `--text-display` | 48px | Main heading; 40px at ≤1120px, 32px at ≤600px |

Headings use 700 weight, balanced wrapping and tight leading: h1 1.05, h2 1.15, h3 1.4. Display tracking is −0.045em; h2 is −0.025em and h3 −0.015em. Body prose uses 1.6 leading and pretty wrapping; normal UI text uses 1.5. Short HUD labels can use 1.4 on phones. Small text has no decorative tracking. Changing numeric fields use tabular numbers. API integer strings are formatted through BigInt without losing precision and can wrap rather than truncate.

There is no monospace prose. Keyboard hints retain the body family. API state values `IDLE` and `SPINNING` intentionally preserve the task’s required casing; headings and interface copy use natural case.

## Layout

`.page-width` caps content at 1264px. Default width is `calc(100% - 96px)`; at ≤1120px it is `calc(100% - 64px)`, at ≤600px `calc(100% - 32px)`, and at ≤360px `calc(100% - 24px)`. Use these shared edges instead of independent section margins.

Repeated gaps use 7–12px within dense game controls, 16–24px within content groups, and 34–52px between page sections. The header is 96px tall by default, 84px at ≤820px and 76px at ≤600px. Its brand stays left and sound/help stay right. Navigation links hide at ≤600px; in-page game and garage links remain available.

The game contains, in order, live speedometer/telemetry, canvas stage, turbo/battle actions and controls. The stage is 420px tall, 380px at ≤820px, 300px at ≤600px, and 290px at ≤360px. Canvas backing resolution respects device pixel ratio, capped at 2; simulation height is 440 logical units and width follows the stage aspect ratio.

At ≤820px the four telemetry fields become two columns. At ≤1120px the directions text moves beneath the main controls. At ≤600px direction buttons and weapon buttons become separate full-width rows and the desktop directions line is hidden. Start/resume scrolls the game shell to the top with the page’s 24px scroll padding, keeping the scene and touch actions together.

Garage and trail grids have three columns on desktop and one at ≤600px. Phone trail rows put a 110px illustration beside the copy. Garage summary values wrap instead of being clipped. The field guide changes from two columns to a stack. Log filters become two labeled columns on phones, with export/clear on the next row. The table remains in page flow.

Observed responsive widths: 320, 390, 600, 820, 1024 and 1440 CSS pixels. Native zoom, translated layouts and RTL were not verified.

## Elevation & Depth

The page is flat. Borders establish the game boundary, selected trails, controls and table rows. Garage upgrade articles use tonal surfaces without shadows. The canvas has layered mesas and gears, but that illustration depth is not a card convention.

HUD plates have an opaque `--surface` background. Health/fuel sit in the track gutter, below the rider. Drive and distance labels sit under the upper HUD; a boss health bar replaces that secondary row during a fight. Pause/results use a `#211e32ed` scrim confined to the stage. Only the modal has a shadow (`0 16px 70px #0008`); its backdrop is `#100e1cbf` with a 3px blur.

## Shapes

Game frame radius is 16px, 12px on phones. Its telemetry corners inset by 1px. Upgrade articles use 12px, trail cards 10px, main controls 7px, HUD plates 5–6px and dialogs 14px. The switch uses a 38×22px pill with a 16px thumb. The rank mark is circular.

Clip the illustration, meters and screen-reader-only text where required. Do not apply clipping or ellipsis to important telemetry, prices, record values or action labels.

## Components

- **Brand and icons:** retain `MouseMark` and `Icon` in `src/icons.tsx`. Decorative SVGs are hidden from assistive technology. Utility buttons have names and 44px hit areas.
- **Actions:** `.primary-button`, `.secondary-button`, `.text-button`, `.icon-button`. A gold fill belongs to the main Start/Resume/Retry action. Secondary battle and purchase actions use borders. Primary/secondary controls are at least 46px tall (44px in the mobile game). Weapon buttons are 58px desktop / 54px mobile; directions are at least 48px. Hover is gated by pointer capability. Enabled presses scale to 0.96 with named 120ms color/border/transform transitions only under no motion preference.
- **Game and input:** `App`, `screen`, `HoldButton`, `SpeedDial` in `src/App.tsx`; deterministic simulation in `src/game.ts`. Hold buttons use pointer capture, cancel/lost-capture release, native button keyboard paths and key-release cleanup. Focus goes to canvas after start/resume, and to the primary action after pause/results. Leaving the window clears held inputs and pauses. The canvas uses a named application role with nearby directions.
- **Live HUD:** `src/telemetry.ts` parses only known values, requests both endpoints every 15s and handles each failure independently. The UI distinguishes loading, missing fields, stale data, errors and recovery. No rotating “live” numbers are generated locally. The native Turbo checkbox exposes its checked state and a text explanation of armed/active behavior.
- **Royal garage:** the `#garage` pattern in `src/App.tsx`, using `buyUpgrade`, `rankLevel`, `maxHp`, `maxJumps` and `cannonDamage`. Display the 40-coin cost, level and current benefit together. Pips are decorative because level text already conveys their meaning. Insufficient funds and level caps disable purchasing with explicit text. Buying pauses and applies immediately.
- **Trails:** `TrailArt` and `.trail-card` preserve the three existing selectable landscapes. Selection uses `aria-pressed` plus a check/text marker. Choices are disabled during live/paused play, with nearby instructions explaining how to change them.
- **Ride log:** semantic table, labeled native selects, actionable empty state, all-ride CSV export and confirmed clearing. Persistence validators in `src/game.ts` retain prior v1 records and keep v2 garage progress separate. Storage failures change the visible persistence explanation.
- **Dialogs:** a native `<dialog>` in `src/App.tsx` provides modal background inertness; explicit Tab/Shift+Tab wrapping, Escape and named close actions preserve keyboard access. Closing returns focus to the opener and leaves the ride paused. Log clearing names its consequence and preserves garage progress.
- **Artwork/audio:** `render`, `drawMouse`, `drawBlimp` and local drawing helpers in `src/art.ts`; `RideAudio` in `src/sound.ts`. Sound is opt-in and uses short local oscillators. Reduced motion freezes decorative parallax and wheel/scarf motion and removes particles, streaks and ability flashes. Essential gameplay motion remains user-started and pausable.

Focus uses a 3px mint perimeter with 4px offset; canvas focus also outlines the game shell on the solid page. Forced-colors rules preserve system Highlight outlines and selected state. A stable polite status region announces meaningful actions rather than every frame or telemetry poll.

## Do’s and Don’ts

Start new content from `.page-width` and the existing section-heading pattern. Reuse the six type sizes and existing button styles. Keep primary gameplay near the top, with directions next to controls. A new upgrade should state its cost/current benefit and use the same paused purchase flow; a new trail should extend `TRAILS` and the existing selection pattern.

Keep API numbers separate from game speed. Treat missing fields as unavailable and retained readings as last-known, never as zero. Keep coins, ranks and records explicitly local. Do not add wallet infrastructure to a read-only telemetry game, an introductory hero that displaces the play action, external runtime art/fonts, or fabricated telemetry/records.

Design guidance attribution: Jakub Krehel’s Better Interface, MIT, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`. Documentation method: Paul Bakaus’s Impeccable, Apache-2.0, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`, copyright 2025 Paul Bakaus. Notices and full license texts are retained in `third_party/Design-reference-LICENSE.txt`. This document describes the implemented source, with coverage limits recorded in `VALIDATION.md`.
