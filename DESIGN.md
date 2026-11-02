# Squeekrider Odyssey design

## Overview

A casual game for a short browser break. An original line-drawn mouse, a muted desert, and warm paper surfaces carry the visual identity. The name was supplied; the setting and mouse character were inferred for this implementation.

The product comes first: a compact utility header, the four-word headline “One mouse. Two wheels.” and a plain game description, then the playable trail. Section titles introduce trail selection, a field guide, and the local ride log. On the checked 390 × 844 screen, the game, Start riding, and jump directions are all visible without scrolling.

The source of truth is `src/styles.css`, with trail artwork colors in `TRAILS` in `src/game.ts`. No CSS framework, external image service, or component library is used.

## Colors

CSS primitives feed semantic roles in `src/styles.css:15`.

| Semantic role | Value | Use |
| --- | --- | --- |
| `--page` | `#f7f4ec` | Warm page background |
| `--surface` | `#fffdf7` | Controls, game instructions, dialogs |
| `--surface-muted` | `#eee9dd` | Field guide, keyboard keys, table heading |
| `--text` | `#303b32` | Main ink |
| `--text-secondary` | `#65695e` | Supporting copy |
| `--border` | `#dcd8cc` | Structural rules and neutral controls |
| `--accent` | `#e87a49` | Main action background |
| `--accent-hover` | `#e07345` | Main action hover background |
| `--focus` | `#374d79` | Keyboard focus outline |
| `--selected` | `#e9eddf` | Selected trail surface |
| `--status` | `#667551` | Availability dot beside the free-play note |

Primary action labels use `#252a21`; the headline's second phrase uses `#8b5438`. Artwork colors remain scoped to the illustrations rather than becoming additional interface accents. The moon trail changes the scene, not the page theme. The ready overlay contains only the primary action; the former intro note and ground signature have been removed.

CSS solid-pair calculations: body ink on surface 11.49:1; secondary ink on page 5.11:1 and muted surface 4.64:1; personal-best value on page 10.63:1; primary action 5.11:1, hover 4.68:1; focus against page 7.64:1. See validation for the scope of these measurements and the canvas limitation.

## Typography

Both variable WOFF2 files are self-hosted in `src/assets/`, declare weights 400–700, and load with `font-display: swap`. Bricolage Grotesque is the display face; DM Sans is the interface/body face. Both fall back to `sans-serif`. The interface uses weights 400, 600, and 700. The root disables synthetic font styles.

| Token | Size at desktop | Role |
| --- | --- | --- |
| `--text-small` | 14px | Captions, navigation, table, compact guidance |
| `--text-body` | 16px | Body, main controls, guide item titles |
| `--text-lead` | 18px | Trail headings, compact brand |
| `--text-title` | 24px | Brand, dialog heading |
| `--text-section` | 32px | Section and game-state headings |
| `--text-display` | 48px | Main headline |

At 1120px and below, display text becomes 40px. At 600px and below, it becomes 32px and section text becomes 24px. The measured page uses six sizes at desktop and five on the phone.

Heading line heights are 1.1, 1.2, and 1.4 for h1, h2, and h3; body copy uses 1.6. Headings balance their wrapping. Display tracking is −0.045em, mobile −0.04em; h2 uses −0.035em, h3 −0.015em. Body tracking remains natural. Descriptive copy uses `text-wrap: pretty`; guide paragraphs cap at 52ch. Counters and table data use tabular numbers. Numeric table cells remain on one line; trail names can wrap.

## Layout

`.page-width` caps content at 1184px. Default side margins are 48px, falling to 32px below 1120px and 16px below 600px. Spacing mostly uses 4px steps: 8–12px within controls, 16–24px between related elements, and 38–64px between major sections.

The personal best stays visible at every width. At 820px and below, `.intro` wraps with a 12px gap; `.personal-best` loses its left rule and padding, and its value and unit become inline at `--text-small`. At 390px this forms a compact line below the explanation. Desktop retains the larger stacked value beside the introduction.

The header is 104px high, 88px below 820px, and 82px below 600px. Desktop navigation disappears below 600px; the logo and utility controls remain. Hash links and contextual links provide navigation through the single page. There is no fixed toolbar over page content.

The game stage is 440px high, 400px below 1120px, and 330px below 600px. The simulation uses a 440-unit logical height and adapts its logical width to the actual stage aspect ratio. HUD and overlays are HTML over the canvas; directions and the Jump button live in normal flow below it. The mobile controls show tap directions. Pause remains a 44px target at every breakpoint.

Trail selection is a three-column grid above 600px. Below that, each full-width selectable row places an illustration beside its copy. The field guide changes from two columns to a vertical stack. At 820px, log labels move above their selects; at 600px, filters and actions wrap into two rows. The table stays in the page flow, including the maximum 999,999 m and 9,999 cheese values.

Observed widths: 320, 390, 600, 820, 1024, 1440. Native zoom, RTL, and physical mobile browsers were not inspected.

## Elevation & Depth

The main page is flat. Borders indicate the game frame, selected trail, controls, and table structure. The field guide uses a tonal background without a border or shadow. Only native dialogs use a shadow (`0 16px 70px #1c2c3033`), with a dimmed, 3px-blurred backdrop. Game pause/results use a light translucent overlay confined to the game scene.

The scene HUD has a solid paper background. Selected trails combine a darker border, tonal fill, check icon, and Selected text. No state depends on color alone.

## Shapes

Game shell: 14px radius, 13px inside artwork and control-strip corners. Trail cards: 10px with 9px image corners. Field guide: 12px. Main buttons: 7px. Selects and the Jump button: 6px. Keyboard keys: 4px. Utility buttons are circular. Dialogs use 14px corners and at least 22px padding on phones. Clipping is reserved for artwork and the scene, not critical data.

## Components

- **Brand and icons:** `MouseMark` and `Icon` in `src/icons.tsx`. The mouse is a filled original mark; utility icons share current-color strokes. Decorative SVGs are hidden from assistive technology. Icon buttons have accessible names.
- **Primary/secondary/text actions:** `.primary-button`, `.secondary-button`, `.text-button`, and `.icon-button` in `src/styles.css`. Main actions have a 48px minimum height. Hover is gated by pointer capability; focus is a 3px outline; pressed controls scale to 0.96 only without reduced motion. Disabled controls remain identifiable and do not invoke actions.
- **Game:** the `.game-shell` pattern in `src/App.tsx` contains ready, riding, paused, and finished states. The canvas paints synchronously after initial sizing and every resize, then uses the existing animation loop. It receives keyboard focus after start/resume. ArrowUp and W continue to jump when Jump or another game button holds focus; Space and Enter retain native button activation. Keyboard focus is drawn around the shell on the solid page background, so it stays visible on all trails. Results and pause controls receive focus when those states open.
- **Trail selector:** `TrailArt` and the `.trail-card` pattern in `src/App.tsx`. Buttons expose `aria-pressed`, selected copy and a check mark. They are disabled during a live or paused ride; nearby copy explains how to change trails.
- **Ride log:** labeled native selects, a semantic table, an actionable empty state, CSV export, and a confirmed clearing action in `src/App.tsx`. No fabricated rides are shipped. `parseSaved` in `src/game.ts` validates persisted values. Storage failure changes the visible persistence explanation.
- **Dialogs:** a native modal `<dialog>` in `src/App.tsx`, with background inertness, explicit Tab/Shift+Tab wrapping, Escape/backdrop/close actions, and focus restoration. Both help and clearing pause an active ride before opening the modal; closing either leaves the ride paused until resumed. Help is available from header and footer. Destructive clearing has a clear consequence, export advice, and a cancel action.
- **Artwork and sound:** `render`, `drawMouse`, `drawCactus`, and `drawCheese` in `src/art.ts`; `RideAudio` in `src/sound.ts`. Canvas art is local and original. Sound has no background soundtrack and is opt-in. Reduced motion suppresses decorative motion; gameplay movement is essential, user-started, and pausable.

## Do's and Don'ts

Reuse `.page-width`, the six type tokens, existing action styles, and native controls. Keep the ride near the top and instructions beside its controls. A new informational section should follow `.section-heading` and normal document flow, using existing spacing and type roles. Keep static navigation as hashes unless actual routes are exported.

Keep future trail colors in `TRAILS` and artwork code. Keep records explicitly local. Preserve the all-time best when trimming recent history. Do not introduce a promotional hero that moves the game off the first phone screen, add external runtime assets, or communicate selection only through a color change.

Design guidance attribution: adapted from Jakub Krehel's Better Interface, MIT, commit `267330e1adfc66a718fb65fa6918c1f06d0a689e`. Documentation method: Paul Bakaus's Impeccable, Apache-2.0, commit `9d715cc4f5564a990ca8345abfdd5df6dc9b41c8`, copyright 2025 Paul Bakaus. The supplied combined license and notice text is retained at `third_party/Design-reference-LICENSE.txt`. These references informed the review; this document describes the implemented source.
