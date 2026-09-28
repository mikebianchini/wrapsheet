# Design

<!-- impeccable:design-schema 1 -->

## World

Apple Human Interface Guidelines, applied literally to a single-page web app. WrapSheet reads as a first-party Apple utility — plain grouped lists, system typography, system color, standard controls — with zero decorative chrome. This replaces the app's prior "Liquid Glass" visual style (blur-heavy cards, gradient-pill buttons, oversized hero countdown numerals), which is now retired.

Mode: **Operate**. The visitor is completing a task (planning gifts), so scanability, consistency with native expectations, and the real usage scene outrank expression. The WrapSheet brand (navy/gold ribbon-bow "W") lives only in the app icon and as a single accent tint — never as a competing palette.

## Typography

System font stack (`-apple-system, "SF Pro Text", "SF Pro Display", ...`) at HIG's type scale:

| Token | Size/Line-height | Weight | Use |
|---|---|---|---|
| `--tx-large-title` | 34/41 | 700 | Screen large titles (collapse on scroll) |
| `--tx-title1` | 28/34 | 700 | — |
| `--tx-title2` | 22/28 | 700 | Modal/sheet titles |
| `--tx-title3` | 20/25 | 600 | — |
| `--tx-headline` | 17/22 | 600 | Row titles, section headers |
| `--tx-body` | 17/22 | 400 | Body copy, controls |
| `--tx-subheadline` | 15/20 | 400 | Secondary row text |
| `--tx-footnote` | 13/18 | 400 | Meta text, status control |
| `--tx-caption1` | 12/16 | 400 | Fine print |
| `--tx-caption2` | 11/13 | 400 | Smallest labels |

## Color

Real Apple system colors, each with light and dark values (`@media (prefers-color-scheme: dark)`):

- `--blue` (systemBlue #007AFF/#0A84FF) — primary tint, links, Idea status
- `--green` (systemGreen #34C759/#30D158) — Bought status
- `--orange` (systemOrange #FF9500/#FF9F0A) — Wrapped status
- `--red` (systemRed #FF3B30/#FF453A) — destructive actions, over-budget
- `--gray` scale — chrome, disabled states
- `--label` / `--label-2` / `--label-3` — HIG label opacity steps for text
- `--bg` / `--bg-elevated` / `--bg-elevated-2` / `--bg-navbar` — systemGroupedBackground layering
- `--fill` / `--fill-2` — systemFill, for control backgrounds
- `--separator` / `--opaque-separator`
- `--brand-navy` / `--brand-gold` — reserved for the app icon and the countdown badge only, never a UI palette

## Materials

Vibrancy (`--material-thin: blur(20px) saturate(180%)`) is scoped strictly to true overlays sitting above scrollable content: the collapsed nav bar and the toast/HUD. Ordinary surfaces (cards, rows, sheets) are flat `systemGroupedBackground` colors — no glass on static content, per HIG.

## Components

- **Nav bar**: sticky, large-title-collapses-to-inline-title on scroll (`bindCollapse()`), trailing badge/icon-buttons.
- **Lists**: inset grouped lists (`.list-row`, `.person` cards as sections) with standard trailing chevron disclosure.
- **Status control**: native `<select>` styled as inline colored text (blue/green/orange by status) rather than a pill background.
- **Filters**: a real segmented control (`.chips`) for status, flat fill-background controls for person/search.
- **Buttons**: standard filled / tinted / plain roles (`.btn.filled`, `.btn.plain`) replacing the old gradient-pill primary button.
- **Icons**: authored inline SVG (`svg()` helper, `ICON_CHEVRON_RIGHT`), one consistent stroke — no Unicode/emoji standing in for icons (except the Dec 25 countdown's single "🎄", a content glyph, not an icon substitute).
- **Sheets**: modals styled as system-style form sheets.
- **Spacing**: 8pt grid throughout.
- **Corner radius**: `--radius-control: 10px`, `--radius-card: 14px`, `--radius-sheet: 20px` — HIG's continuous-curve scale, down from the prior 20–26px "liquid" rounding.

## Product change bundled with this redesign

Per explicit request, the surprise/hidden-status mechanic was removed: gift status, price, and buyer are now shown to every viewer for every person, including a viewer's own linked person-card. The `mine`-gated visibility branches in `personCard`/`giftRow` were deleted; the person-card "This is you / Unlink" labeling logic was kept (cosmetic only now, see PRODUCT.md).

## Process note

This build was code-led: Apple HIG was pinned by name/URL in the request, so the concept-seed/decision-page/image-generation direction-invention pipeline was skipped in favor of committing directly to HIG's own native grammar (per `new-work.md`: "a user- or brief-pinned direction beats the roll, always"). The Direction Contract is recorded at `.impeccable/surfaces/public-index-html.md`.
