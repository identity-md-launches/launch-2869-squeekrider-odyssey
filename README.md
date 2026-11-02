# Squeekrider Odyssey

A small, illustrated browser game about Pip, a mouse on a bicycle taking the long way home. Jump rocks and cacti, collect cheese, and try three endless desert trails.

The assignment supplied the product name without a detailed game specification. The mouse rider, desert setting, rules, and visual direction are implementation choices.

## Run and rebuild

Use Node.js 22.12 or newer and npm.

```sh
npm ci
npm run dev
```

For a production check and preview:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Open the preview address printed by Vite. Serve the site over HTTP or HTTPS; opening an ES-module application directly through a `file:` URL is not the supported preview method.

`npm run build` replaces `dist/`. The complete production export, source, package manifest, and lockfile are included together. Vite uses `base: './'`; fonts, icons, artwork, share image, styles, and scripts are local. Navigation uses section hashes, with no server rewrites. Serve the contents of `dist/` at a root or a subpath. Hosting is handled after this assignment.

## Play

- Choose Sunbaked valley, Cactus pass, or Moonlit mesa, then select **Start riding**.
- Tap the trail, press Space, Arrow Up, or W, or use **Jump**. Jump a second time in the air for a double jump.
- Avoid rocks and cacti. Each cheese pickup adds one snack, independently of distance. The ride gradually speeds up.
- Use the pause control, P, or Escape for a breather. P or Escape resumes a paused ride; **Resume ride** is also available. Leaving the window or hiding the tab pauses play.
- A collision ends the ride. Retry immediately or choose another trail. **Finish this ride** is available while paused.

Sound is optional, starts through an explicit interaction, and uses short synthesized effects. It does not fetch audio.

## Records and privacy

The latest 20 completed rides, an all-time personal best, and the sound preference are saved under `squeekrider-odyssey-v1` in this browser's local storage. There is no account, shared leaderboard, analytics, wallet, or backend. A personal best remains after its ride leaves the 20-entry history. Clearing the log, after confirmation, also clears that best.

Filter by trail, sort by latest or longest, or export all saved rides as CSV. Export includes UTC timestamps. The displayed dates use the browser's local time. Invalid saved data is discarded. If storage is blocked, the page explains that records last for the current visit, and the game remains playable.

## Checks actually run

The final source and lockfile were copied into a fresh temporary directory. `npm ci`, `npm run typecheck`, `npm test`, and `npm run build` all exited successfully. Its final `dist/` is the delivered production export. Frontend dependencies and package caches were kept outside the submission tree; no ignore file was added or changed.

| Check | Actual result |
| --- | --- |
| Clean install and production build | Passed; 33 modules transformed |
| TypeScript | Passed, no errors |
| `npm test` | 11 tests passed, including 200 seeded game simulations |
| Production browser interactions | 15 grouped checks passed in Chromium |
| Pinned taste@1 probe | All 16 checks passed at 320, 390, and 1440 wide |
| axe-core 4.10.3 | No reported violations in five inspected states |
| Offline runtime and subpath | Loaded at `/preview/` with external requests blocked; no script errors or missing assets |
| Responsive interaction review | 320, 390, 600, 820, 1024, and 1440 wide; maximum counters and 20-record history checked |

The optional browser suite is included at `scripts/validate-browser.mjs`. It serves the production export itself in a bounded foreground process and closes its server and browsers afterwards. With Playwright available locally:

```sh
IMD_PLAYWRIGHT=/absolute/path/to/playwright/index.mjs \
PLAYWRIGHT_BROWSERS_PATH=/absolute/path/to/browsers \
node scripts/validate-browser.mjs
```

Optionally set `AXE_SCRIPT` to a local `axe.min.js` to include accessibility scans. Neither Playwright nor axe is needed to build or run the site. The suite writes temporary evidence under `test/scratch/`; that folder is not part of the deliverable.

The supplied design probe was also run with its external Playwright module and `--out test/scratch/taste --offline`. The review, fixed findings, measured color pairs, and coverage limits are recorded in [VALIDATION.md](VALIDATION.md). The implemented design system is documented in [DESIGN.md](DESIGN.md).

## Limitations

WebKit could not launch because its browser executable is absent in the supplied runtime. Safari and physical devices were not verified. The browser connector itself returned `Transport closed`; inspection used local headless Chromium screenshots and interaction automation instead. Native 200% zoom, RTL presentation, and screen-reader sessions were not performed.

The surrounding interface supports keyboard operation and semantic controls, but the real-time obstacle game is visual and does not provide a complete nonvisual equivalent. Reduced motion removes decorative dust, scarf and wheel animation, smooth scrolling, and UI transitions; essential trail movement continues during play and has a visible pause control. Automated scans do not establish full accessibility compliance. Records are local and can be edited or erased through browser storage.

## Project map and credits

`src/App.tsx` owns the UI and lifecycle; `src/game.ts` contains the deterministic simulation and storage validation; `src/art.ts` draws the original canvas artwork; `src/styles.css` defines the visual system. `public/` contains the source favicon, share PNG, and runtime license notices. `tests/game.test.ts` checks the engine. `dist/` is the complete static delivery.

The two local variable fonts are Bricolage Grotesque and DM Sans, distributed under the SIL Open Font License. React and React DOM are MIT licensed. Notices are retained in `public/licenses/` and copied into `dist/licenses/` by the build. The design review applies Jakub Krehel's Better Interface guidance and Paul Bakaus's Impeccable documentation method; their pinned notices and license texts are retained in `third_party/Design-reference-LICENSE.txt` and [DESIGN.md](DESIGN.md).
