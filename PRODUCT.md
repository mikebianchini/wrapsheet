# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Mike Bianchini's own family and friend circle — the people he personally invites to a given list via a share link. Not a self-serve product for strangers; no onboarding, discovery, or general-audience polish is required. Everyone on a list is there because Mike (or another list creator) sent them the link directly.

## Product Purpose

A private, real-time shared gift list a family/friend group uses to plan holiday (primarily Christmas) gift-giving together and avoid duplicate purchases. Multiple people can add gift ideas for the same people, mark items bought/wrapped, and see the whole group's progress at a glance.

There is deliberately **no surprise-hiding**: everyone on a list — including a person viewing their own entry — can see full gift details, status, price, and who's buying, for everyone on the list. (An earlier build hid a viewer's own gifts from themselves to preserve surprise; that mechanic has been explicitly removed. Full visibility for all, all the time, is now the intended behavior.)

## Positioning

A lightweight, zero-friction alternative to a shared spreadsheet or group text for gift planning: sign in with Google, create or join a list via a link, and changes sync to everyone instantly. No accounts to manage beyond Google sign-in, no app to install (PWA-installable but works as a plain web page), no per-person invites to approve.

## Operating Context

- Used seasonally, concentrated around the Christmas holiday (the app shows a live countdown to Dec 25).
- A "list" (internally a "board") belongs to whoever created it; anyone with its link can view and edit it — the same trust model as a shared Google Doc.
- Within a list: a roster of "people" (recipients — typically family members), each with an optional group tag (Family/Friends/Neighbors/Other), optional budget, and optional gift-preference notes.
- Gifts belong to a person (or sit "unsorted" until assigned) and carry a title, price, link, notes, image, and status (Idea → Bought → Wrapped).
- Gift ideas can be added by pasting a product link (auto-enriched with title/price/image via a client-side metadata fetch) or typed manually; also supports a share-sheet/Shortcut-based quick-add from a phone.
- An activity feed logs who added/changed what, for a group catching up async.
- One person can optionally "link" themselves to a person-card (marks it as literally them) — this previously drove the surprise-hiding; now that hiding is removed, its only remaining purpose is labeling ("This is you" / "<Name> is this person"), which may be reconsidered during the redesign since its original reason (surprise) no longer applies.

## Capabilities and Constraints

- Single-file vanilla HTML/CSS/JS app (no framework, no build step) at `public/index.html`, deployed to Firebase Hosting via GitHub Actions on every push to `main` (repo: `mikebianchini/wrapsheet`, live at `ourwrapsheet.web.app`).
- Firebase Auth (Google sign-in only) + Firestore (real-time listeners) for all data; Firestore security rules trust any signed-in user who has a board's link.
- No backend functions/server — deliberately kept off Firebase's paid Blaze tier, so no server-side push notifications, scheduled jobs, or email.
- Client-side link-metadata enrichment (title/price/image from a pasted product URL) via a public metadata API called directly from the browser.
- Must keep working as a plain, installable PWA (manifest + icon set already in place) — no native app wrapper.

## Brand Commitments

- Name: **WrapSheet**.
- Existing mark (`public/icons/`, full size set 16–1024px, already wired into the manifest and favicons): a navy rounded-square with a gold ribbon-bow forming a stylized "W". This is a real, finished logo — not a placeholder — and should carry forward into the redesign; its navy/gold pairing is a reasonable seed for the new palette but is not a hard constraint beyond the mark itself.

## Evidence on Hand

- Live production app with real data: an active "Christmas 2026" list with real people, gift ideas, and prices.
- Finished icon/logo set at `public/icons/` (see Brand Commitments) — real, not to be regenerated or replaced.
- No existing DESIGN.md; the current implementation is a hand-built "Apple Liquid Glass" visual style (blur surfaces, capsule buttons, warm gold accent) that this redesign replaces. Treat it as evidence of product structure and anti-reference for the new visual world, per the redesign flow.

## Product Principles

1. **Everyone sees everything.** No hidden state between list members — full transparency is now core to the product, not a tradeoff.
2. **Zero setup friction.** Google sign-in and a link are the entire onboarding; never add a step that isn't strictly necessary for a small trusted group.
3. **Real-time, always.** Every view reflects live Firestore state; the app should never make a user wonder if they're looking at stale data.
4. **Small group, high trust.** Design and permissions assume everyone on a list is personally invited and trusted — not a general public product.
5. **Static and cheap to run.** No server code, no paid Firebase tier; the implementation stays a single deployable static file.

## Accessibility & Inclusion

No specific accessibility requirement has been raised by the user beyond ordinary good practice (the existing app already uses semantic controls, `:focus-visible` states, and `prefers-reduced-motion`/`prefers-color-scheme` support). Carry these forward; no stricter standard has been established.
