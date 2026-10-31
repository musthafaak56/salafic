# LM tracker

## Overview

`/lmtracker` is a public, login-free daily practice checklist. This document covers only that surface, not the wider Salafic design system. The chosen direction extends the existing design directly: a calm checklist rather than a dashboard of cards.

Progress is stored locally in this browser, independently for each local calendar date. There is no account or cross-device synchronization. Clearing browser data removes saved progress; people sharing the browser can access it. Storage failures produce an on-page warning and retain the current checks only while that page remains open.

## Colors

Reuse Salafic's existing light/dark tokens: primary blue for selection and completion, primary-soft for hover, ink and secondary ink for text, and line for dividers. Do not introduce a separate tracker palette.

## Typography

Inherit the existing site fonts. The heading scales from 32px to 44px; group titles are 20px. Dates and totals use tabular numerals for stable alignment.

## Layout

A compact brand header leads into a centered, single-column checklist (main maximum width 752px). Seven equal date buttons show a rolling window from three days before today to three days after, with today fourth. The selected date controls the checklist below. At widths up to 480px, horizontal padding and date-strip gaps tighten while all seven dates remain visible.

## Elevation & Depth

Flat rows, subtle dividers, and state colors provide hierarchy without card stacks or decorative shadows.

## Shapes

Date buttons have 8px corners. Native checkboxes are 22px square inside full-label rows at least 52px high. Progress is a flat 5px bar.

## Components

- **Date strip:** today's button has an outline; the selected date has a filled primary background. Accessible labels include the full date.
- **Checklist:** four named groups contain all 44 supplied entries. Repeated labels remain distinct items. “Habits to protect” means checking a habit when it was avoided that day.
- **Completion:** each check earns one mark. The daily count, progress bar, and total use 44, correcting the supplied total of 43 without dropping an entry.
- **Persistence:** `salafic-lmtracker-v1:YYYY-MM-DD` stores checked item IDs in browser local storage. Switching dates reloads that date's independent state; same-origin browser tabs receive storage updates. The rolling window follows local dates, refreshing on focus and every 30 seconds.
- **Access:** native inputs, visible keyboard focus, grouped labels, live completion announcements, and storage-error alerts support keyboard and assistive-technology use. The existing theme toggle is retained.

## Do's and Don'ts

- Do preserve local-only, no-login behavior and clearly explain browser-data loss.
- Do keep all 44 entries and the centered seven-day date strip.
- Don't imply cloud backup, account privacy, or cross-device synchronization.
- Don't turn this scoped extension into a redesign of unrelated app surfaces.

## Verification and handoff

Finish review disposition: **ship**, with no material fixes required. Four Node tests passed; browser refresh persistence and day isolation were verified. Review captures are `.impeccable/review/lmtracker-desktop.png`, `.impeccable/review/lmtracker-user520.png`, and `.impeccable/review/lmtracker-mobile-dark.png`.

Implementation: `src/pages/LMTracker.jsx`, `src/pages/LMTracker.css`, and `src/lib/lmtracker.js`. Product constraints are recorded in `PRODUCT.md`; the surface direction is recorded in `index.html`.

No deployment was performed.
