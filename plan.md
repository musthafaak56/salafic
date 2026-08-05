# Salafic UI & Product Plan

## Objective

Evolve Salafic into a calm, trustworthy masjid-management experience for visitors and administrators. The public home page should make today’s prayer times and financial transparency effortless to understand; authenticated staff should be able to maintain donations, expenses, and prayer times without friction.

The visual direction is **white and blue by default**, with a first-class **dark mode** that keeps the same hierarchy and clarity. The design should feel premium and simple: considered, calm, and institutional—not like a generic finance dashboard.

## Current baseline

- React + Vite application styled with Tailwind CSS v4.
- Firebase supplies authentication, user profiles/roles, and Firestore data.
- Existing routes: public home (`/`), login (`/login`), and protected admin dashboard (`/admin`).
- Home already presents prayer times, donation totals, expense totals, balance, and recent activity.

## Design foundation

### Brand character

- Calm, precise, welcoming, transparent—and quietly premium.
- Use generous whitespace, strong numerals, restrained borders, and quiet surfaces to make operational information easy to scan.
- Let blue communicate primary actions and active states. Reserve green/red only for financial direction and validation so colour retains meaning.
- Use one primary typeface, a tight type scale, and a limited visual vocabulary; premium should come from proportion, alignment, and quality of detail, not ornament.
- Avoid gradients, glass effects, loud illustrations, excessive shadows, over-rounded controls, dense card grids, and competing accent colours.

### Premium simplicity rules

- Prefer one clear focal point per section. A user should understand a section in one glance.
- Keep surfaces mostly flat: 1px borders and a single subtle shadow only for overlays or the most important action area.
- Use 12px corners for panels and 8px corners for controls; do not mix many radii.
- Limit primary actions to one per view. Use quiet text or outline actions for secondary choices.
- Give every card a reason to exist. Combine related information before adding another container.
- Use icons only when they improve recognition, always with a text label for important actions.
- Maintain consistent left alignment, predictable spacing, and short line lengths. Let content, rather than decoration, create visual interest.

### Theme tokens

Implement semantic CSS variables in `src/index.css`; Tailwind utility usage should reference those semantic values rather than hard-coding gray/emerald palettes throughout pages.

| Role | Light mode | Dark mode |
| --- | --- | --- |
| Application canvas | `#F7FAFF` | `#0B1220` |
| Raised surface | `#FFFFFF` | `#121C2E` |
| Subtle surface | `#EEF5FF` | `#19263B` |
| Primary blue | `#2563EB` | `#60A5FA` |
| Primary hover | `#1D4ED8` | `#93C5FD` |
| Primary text | `#0F172A` | `#F8FAFC` |
| Secondary text | `#52627A` | `#A8B4C7` |
| Border | `#D9E4F3` | `#2B3A51` |
| Positive | `#15803D` | `#4ADE80` |
| Negative | `#B91C1C` | `#F87171` |

Typography: use the system sans-serif stack initially; establish a clear type scale (12/14/16/20/28/36px) with tabular numerals for currency and prayer times. Use an 8px spacing rhythm and 12px card radius.

### Dark mode behavior

- Add a visible, accessible theme toggle in the global header.
- Default to the user’s saved choice. For a first visit, follow `prefers-color-scheme`.
- Apply the theme to the document root using `data-theme="light"` / `data-theme="dark"`, persist it in `localStorage`, and set `color-scheme` accordingly.
- Ensure focus rings, borders, disabled states, tables, empty states, and input backgrounds are designed for both modes—not merely colour-inverted.
- Respect `prefers-reduced-motion`; theme changes should be immediate or use a very short, non-essential transition only.

## Experience plan

### 1. Shared application shell

- Replace the current minimal header with a responsive top bar: Salafic wordmark, context-aware navigation, theme toggle, and account controls.
- On small screens, keep the logo, theme control, and compact account/menu action on one row; do not hide critical navigation behind an ambiguous icon without labels.
- Create reusable primitives for `PageContainer`, `SectionHeading`, `Card`, `Button`, `StatusBadge`, `EmptyState`, and `LoadingState` so public and admin screens stay visually coherent.
- Define keyboard-visible focus states and minimum 44px interactive targets.

### 2. Public home (`/`)

- Open with a concise welcome block: date, location placeholder/configuration, and a prominent “Next prayer” panel. Derive the next prayer from the existing times only when valid data is present; otherwise show the existing helpful empty state.
- Present the six daily/Jumuah prayer times in a single responsive timetable. Highlight the next/current prayer using blue, while ensuring the visual distinction is not colour-only.
- Reframe financial totals as a “Community finances” section with labelled collected, spent, and current balance figures. Keep currency values prominent and use positive/negative colours only on the transaction deltas.
- Keep recent donations and expenses as separate, equal-weight activity lists with readable dates and sensible truncation for long notes.
- Clearly communicate “last updated” information and stale/missing prayer-time data.

### 3. Authentication (`/login`, `/register`)

- Place the form inside a focused, narrow authentication layout rather than the dashboard shell.
- Use clear labels, inline validation/help, password visibility control, submit loading state, and an obvious path between sign-in and registration.
- Keep error messages specific but safe; never reveal account-existence details unnecessarily.

### 4. Admin dashboard (`/admin`)

- Use a desktop sidebar or structured navigation rail for Overview, Donations, Expenses, and Prayer Times; use an accessible compact navigation pattern on mobile.
- Make the overview operational: balance snapshot, current prayer-time status, today’s records, and quick actions for adding a donation, expense, or prayer schedule.
- Give data-entry forms grouped labels, formats/examples, inline errors, safe cancel behavior, and a clear success confirmation.
- Standardize list/table layouts with mobile-friendly stacked rows, sortable/filterable controls only where the current data volume warrants them, and empty states that point to the relevant action.
- Restrict admin-only controls to the existing role guard and never rely on hidden UI as authorization.

## Implementation sequence

1. **Audit and protect behavior**
   - Review existing Firestore helpers, route guards, and admin forms.
   - Record the currently supported fields and permission assumptions before changing components.

2. **Establish theming**
   - Add the semantic tokens and `data-theme` styles to `src/index.css`.
   - Build a small theme context/hook and header toggle with persistence and system preference support.
   - Replace page-level hard-coded neutral/emerald colour utilities with semantic component styles.

3. **Build the reusable UI layer**
   - Add shared layout, action, feedback, and display components under `src/components/`.
   - Confirm component states: default, hover, focus-visible, disabled, loading, empty, error, and dark mode.

4. **Refresh public flows**
   - Implement the new application shell and home hierarchy.
   - Add robust next-prayer calculation and fallbacks without changing the Firestore data contract.
   - Update login and registration to use the shared authentication layout.

5. **Refresh admin flows**
   - Apply the admin navigation and overview structure.
   - Refactor donation, expense, and prayer-time forms to use the same field and feedback patterns.
   - Preserve all existing authorization and Firestore writes.

6. **Quality assurance and polish**
   - Test light, dark, and system-preference themes across desktop and 320px mobile widths.
   - Test keyboard-only navigation, visible focus, contrast, form errors, loading/empty/error data states, and sign-out.
   - Run `npm run lint` and `npm run build`; manually verify public and admin routes against Firebase emulator or the configured project.

## Acceptance criteria

- A visitor can find today’s prayer times, next prayer, current balance, and latest activity on the home page without signing in.
- The default visual language is white, blue, and high contrast; green/red are semantic exceptions, not the primary palette.
- Theme choice persists, follows OS preference initially, and every screen is legible in both themes.
- The public site and admin tools share one component language while maintaining different information density.
- Existing Firebase authentication, role protection, reads, and writes continue to work.
- Layouts remain usable at narrow mobile sizes and via keyboard.
- Lint and production build pass before release.
