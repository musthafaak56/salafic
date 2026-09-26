# Worldwide Masjid & Center Platform Plan

## Product goal and scope

Evolve the existing Cherukunnu website into one shared platform for masjids and Islamic centers worldwide. Each center gets its own identity, public page, prayer schedule, finances, events, forms, TV display, and administration area. Cherukunnu becomes the first center on the platform and retains its existing records.

Visitors can view prayer times, published donations, and published expenses without logging in. Authentication is required for management, not public browsing. Preserve the premium, simple white-and-blue design and first-class dark mode described below.

This is an implementation plan only. Production migration and deployment are separate execution steps.

## Current codebase: reusable foundations and gaps

| Area | Current behavior | Planned change |
| --- | --- | --- |
| Database | Records already live under `masjids/{masjidId}` | Preserve this structure; enforce center isolation everywhere. |
| Data access | `src/lib/firestore.js` defaults to `main`; many forms pass `main` directly | Require an explicit resolved center ID for every center-specific operation. |
| Identity | Home, header, authentication, and TV contain Cherukunnu labels | Load identity, imagery, address, contacts, and page titles from configuration. |
| Prayer location | API and TV have different hard-coded coordinates | Verify Cherukunnu's coordinates and use one location configuration per center. |
| Formatting | `en-IN` and `INR` appear throughout the app | Make locale, currency, timezone, and time format configurable. |
| Authorization | Roles and `masjidIds` come from user profiles | Introduce server-controlled center memberships and separate platform permissions. |
| Profile rules | Owners can write their entire user profile, including authorization fields | Restrict editable profile fields before admitting additional centers. |
| Public finances | Funds are private, but expense documents are publicly readable | Publish sanitized summaries/activity separately from private ledgers. |
| Routing | Public and admin URLs do not identify a center | Add stable center URLs and compatibility redirects. |

## Platform and center experiences

### Platform

- `/` becomes a neutral platform introduction with center search and a clear “Register your center” action.
- `/centers` lists published centers with country/city filters, addresses, pagination, and normalized name-prefix search. Defer advanced full-text and distance search.
- Visitors may remember a preferred center locally without an account; the active center and switch action remain visible.
- Center representatives apply through a signed-in onboarding flow. Platform staff review applications before publication.
- Keep Salafic as a working platform name; final branding and domain selection are separate decisions.

### Individual centers

- Configure display name, center type, logo, cover image, description, address, coordinates, contact details, and map link.
- Provide public prayers, iqamah times, Jumuah sessions, financial transparency, announcements, events, and forms.
- Provide a private dashboard, settings, staff management, and a center switcher for users managing multiple centers.
- Keep Quran tools shared. Make local programs and documents optional; existing QHL content must not become the default content for every center.
- Initially support one location and accounting currency per center. Model separate branches as separate centers; defer consolidated branch accounting.
- Record donations and expenses in the first release. Online payments, subscriptions, custom domains, and currency conversion are later projects, not implied by displaying donation records.

## Route plan

| Route | Purpose | Access |
| --- | --- | --- |
| `/` and `/centers` | Platform home and directory | Public |
| `/c/:slug` | Center home | Public |
| `/c/:slug/prayer-times` | Daily/monthly timetable | Public |
| `/c/:slug/finances` | Published donations, expenses, reports | Public |
| `/c/:slug/events` | Center events | Public |
| `/c/:slug/forms/:formId` | Published form | Public |
| `/c/:slug/tv` | Center TV display | Public |
| `/quran` | Shared Quran tools | Public |
| `/login` | Authentication with a validated return path | Public |
| `/onboarding` | Center registration application | Signed in |
| `/c/:slug/admin/*` | Center operations, settings, team | Authorized center member |
| `/platform/*` | Applications and platform administration | Platform administrator |

Resolve the URL slug to an immutable center ID before loading records. Reserve normalized slugs atomically through a trusted backend, protect reserved names, and retain aliases after slug changes. Unknown or unpublished centers must never silently fall back to Cherukunnu. Saved center preferences are navigation conveniences, not authorization.

On center switches, cancel old listeners, clear center-specific form state, and include the center ID in cache keys. Prevent stale requests from displaying or saving data under the wrong center.

## Onboarding and permissions

The platform super admin is **musthafaak56@gmail.com**. All masjid/center registration requests appear in this account's private platform review inbox, with an email notification to the same address. The super admin can approve, reject, or request corrections and manage prayer adjustments for any center.

Provision this privilege through a trusted setup process tied to the verified Firebase account UID for that email. Do not grant super-admin access based on a client-editable profile email or a frontend email comparison. The email notification is a convenience; the stored application and dashboard remain the source of truth, with retryable notification delivery.

1. Representative signs in and submits center identity, country/address, coordinates, timezone, currency, language, contact details, and a required **designated admin email**. This email may differ from the submitter's email.
2. Validate fields and show possible duplicates. Require confirmation of location and timezone rather than using the representative's device location automatically.
3. Save a private application, including the designated admin email, and notify **musthafaak56@gmail.com**. No center-management access is granted while the request is pending.
4. Super-admin approval creates the draft center and grants its initial administrator membership to the verified account matching the designated admin email through a retry-safe backend operation. If that account does not yet exist or is not verified, keep the grant pending and send an expiring invitation; activate it only after the intended recipient signs in with that verified email. Do not automatically make the submitter the admin.
5. The designated center admin completes a draft setup checklist: branding, location-derived prayer defaults, opening financial balance, and initial content. This initial admin also receives the center settings/team capabilities described as owner capabilities below.
6. Publish after approval and configuration validation. Keep approval and publication status distinct.
7. The center admin invites additional staff using expiring, single-use invitations accepted by the intended authenticated recipient.

Define capabilities for owner (settings/team), administrator (daily operations), finance editor, and prayer/events editor. Protect the last owner and provide an audited ownership-transfer flow. Platform administrators have separate permissions; any access to private center records must be explicit and audited.

## Announcements with automatic expiry

- Let authorized center staff publish Eid timings, Ramadan programs, closures, and urgent notices on the center home page and TV display.
- Store a title, message, priority, target surfaces, start time, and required expiry time. Enter dates/times in the center timezone and store resolved instants consistently.
- Support drafts and scheduled publication. Only show notices within their published visibility window; remove expired notices automatically from public views, including an already-open or offline TV display.
- Retain expired notices privately for history and reuse. Reusing one creates a new draft with new dates rather than silently reactivating old content.
- Use a restrained prominent treatment for urgent notices, with readable text and no reliance on color alone.

## Preview, publishing history, and undo

- Provide an authenticated preview of prayer schedules, announcements, and public financial reports using the same rendering components as the public pages, including mobile and TV views where relevant.
- Keep draft changes private until an authorized admin explicitly publishes them. Preview must show the destination center, applicable dates, and resulting adjusted prayer times.
- Show public financial previews using only approved public fields; never render donor details or internal notes into a public report preview.
- Store revision history with author, timestamp, changed fields, and publication status. Detect concurrent edits before publishing so an older draft cannot overwrite newer changes silently.
- Allow an authorized admin to restore a previous version by creating and publishing a new revision; preserve the original history. Recheck permissions, dates, and expired announcements before restoration.
- Undo applies to published content/configuration. It must not delete ledger transactions or rewrite financial history: financial corrections use explicit recorded adjustments and regenerated summaries.

## Registration request tracking

- Give applicants a private request-status page showing **Pending review**, **Changes requested**, **Approved**, or **Rejected**, with a dated activity history.
- When requesting corrections or rejecting a request, the super admin supplies a clear applicant-facing reason. Keep internal review notes separate and private.
- Let applicants edit and resubmit a request when changes are requested, retaining prior submissions and reviewer feedback. Revalidate any changed designated admin email before approval.
- Notify applicants of status changes and show the same status in their dashboard. Failed email delivery must not lose the request or block its review.
- Give **musthafaak56@gmail.com** one review queue with status filters, submission dates, center/location details, designated admin email, and possible duplicate centers.
- After approval, separately show whether the designated admin has accepted the invitation and whether the center is draft or published; approval does not imply onboarding is finished.
- Restrict request access to the submitter and super admin. Share only the necessary invitation details with the designated admin if that is a different person.

## Reliable TV mode during internet outages

- Cache the TV application shell and the last successfully downloaded public center configuration, schedule, and announcements so a previously loaded display can reopen after a connection loss.
- Cache by center, local date, and configuration version. Retain a bounded upcoming schedule window when available; never substitute another center's cache.
- Continue the local clock and next-prayer countdown from a valid cached schedule. Show connection status, last successful sync, and a clear stale-data indicator.
- When no valid schedule exists for the center's current local date, show “Today's schedule unavailable” rather than presenting yesterday's times as current. A first visit without connectivity needs a clear offline message.
- Expire announcements using their saved visibility windows even while offline. Never cache private admin, ledger, or form-response data for TV use.
- Reconnect automatically with bounded retry/backoff, fetch fresh published data, and replace the displayed version without requiring a manual refresh. Refresh after the device wakes and at local midnight.
- Define cache invalidation and application update behavior. A reconnected display must remove withdrawn content; an offline display cannot receive withdrawals until connectivity returns, so freshness remains visible.

## Data model and security requirements

Retain the internal `masjids` collection name to minimize migration risk; use “center” in the product and application abstractions.

```text
users/{uid}                          safe personal profile and preferences
platformRoles/{uid}                  server-controlled platform permissions
centerApplications/{id}              private onboarding and review
centerSlugs/{slug}                   public slug-to-center mapping
masjids/{centerId}                   public identity and directory fields
  members/{uid}                     trusted membership and capabilities
  settings/private                  private operational configuration
  prayerTimes/{localDate}            published local schedule and source
  funds/{id}                        private donation ledger
  expenses/{id}                     private expense ledger
  publicFinance/{periodId}           sanitized totals and freshness
  publicTransactions/{id}            approved public transaction fields
  events/{id}                       published events
  eventDrafts/{id}                   private event drafts
  announcements/{id}                published notices and visibility windows
  announcementDrafts/{id}            private notice drafts
  contentDrafts/{id}                 private schedule/report publication drafts
  contentRevisions/{id}              restricted version history for restoration
  forms/{id}                        published form definitions
  formDrafts/{id}                    private form drafts
  formSubmissions/{id}               private submitted responses
  invitations/{id}                   restricted invitation metadata
  auditLogs/{id}                     append-only administrative history
```

Public configuration includes slug, display name, center type, country code, city/address, coordinates, IANA timezone, ISO currency code, default locale, supported languages, branding, enabled modules, and publication status. Private contacts and internal notes belong in separate restricted documents: hiding fields in the UI does not prevent Firestore readers from receiving them.

Applications store `designatedAdminEmail`, submitter UID, review status, reviewer UID, review timestamps, and invitation/grant status privately. Record the approved email and resolved member UID for audit purposes. Prayer configuration stores signed per-prayer minute offsets, defaulting to zero, alongside calculation settings and its update history.

- Require a center ID in every data-service function, export, subscription, and upload path.
- Enforce membership in Firestore rules and backend handlers. Client-supplied IDs and hidden controls are not permission checks.
- Restrict self-service profile writes to harmless allowed fields. Move all authorization away from editable profile roles.
- Protect role grants, slugs, verification, audit history, and memberships through narrowly authorized backend workflows.
- Public queries must match published-center and published-content rules. Drafts and suspended content must not leak through the directory or direct URLs.
- Keep form responses private. Validate submission schema/size and implement backend rate limiting and abuse controls for anonymous submissions.
- Apply equivalent isolation to storage paths and media access when uploads are introduced.
- Add emulator tests for role escalation and cross-center reads/writes, including crafted requests outside the application UI.

## Worldwide prayer times, dates, and events

- Store confirmed coordinates and an IANA timezone for each center. Never fall back to Cherukunnu or silently substitute the visitor's location.
- **Default prayer times are automatically calculated from the location provided in the center request**, using its timezone, local date, and configured calculation method. No manually entered timetable is required to obtain the initial schedule.
- **Both the center admin and the super admin can add or subtract minutes for each prayer**, preserving the existing adjustment capability. Show the calculated base time, signed adjustment, and resulting time; for example, `+5` adds five minutes and `-3` makes the prayer three minutes earlier. Include a reset-to-zero action.
- Persist these adjustments per center and apply them once to each day's newly calculated base times: `adjusted time = base time + signed minute offset`. Re-fetching, refreshing, or generating another date must not compound offsets. Keep offsets when recalculating after a location/method change, and preview the resulting schedule before saving.
- Support calculation method, Asr convention, high-latitude handling, prayer-specific adjustments, and manual overrides. Verify provider/library support during implementation.
- Separate calculated adhan times from locally announced iqamah times. Support multiple Jumuah sessions; label sunrise separately from prayers.
- Resolution order: an explicitly published date-specific manual timetable takes precedence; otherwise use location-calculated times plus saved adjustments. Treat a manual timetable as final, so offsets are not applied to it again. Clearly label calculated/adjusted times, missing data, and stale schedules.
- Apply the same resolved times to public pages, monthly views, posters, and TV. Audit changes by both admin roles, reject unauthorized changes, and detect conflicting edits rather than silently overwriting a newer adjustment.
- Fetch the schedule for the center's current local date, not simply the latest stored document, which may be future-dated.
- Handle next-prayer transitions across midnight and daylight-saving changes independently of the visitor's device timezone.
- Store event instants in UTC and display them in the center timezone. Recurring events need local wall-time rules plus timezone to remain correct through daylight-saving changes.
- Share schedule resolution across home, monthly views, posters, and TV. Cache by center, local date, and configuration version; show freshness during outages.
- Support a locally managed Hijri-date adjustment separately from the civil dates used for records.

## Public finance behavior

- Preserve login-free access to published totals and approved activity. Keep the original donation and expense ledgers private.
- Publish only approved date, category, amount, currency, and a deliberately public description. Exclude donor identity, contacts, bank references, private receipts, and internal notes by default.
- Store integer amounts in currency minor units, respecting zero- and three-decimal currencies. Format through `Intl.NumberFormat` using the center currency and display locale.
- Use one base currency per ledger. Prevent casual currency changes after transactions exist; never reinterpret old values or sum different currencies.
- Define balance as opening balance + donations − expenses, including explicit adjustments. Never derive totals from a limited recent-activity list.
- Show reporting period, coverage, and last update. Distinguish an empty ledger, unpublished data, and a failed request rather than showing a misleading zero balance.
- Publish summaries through a trusted aggregation process that is idempotent, handles edits/deletes, and supports reconciliation from private records.
- Allow summary-only or sanitized transaction detail. If the finance module is intentionally unavailable, display that state without exposing private records.

## Worldwide design and localization

Use the design foundation below across all centers. Local identity comes from logos, names, and imagery while the shared premium white-and-blue system remains consistent.

- Platform home: concise purpose, prominent search, country/city filters, clean results, and center registration.
- Center home: identity/location, today's prayers, finances, announcements/events, and contact details in that order.
- Admin: persistent active-center name, clear switcher, and navigation for Overview, Prayers, Finances, Events, Forms, Settings, and Team. Identify the destination center before significant actions.
- TV: readable times, local date/time, center identity, announcements, and schedule freshness.
- Move interface strings into translation resources. Pilot reviewed English, Malayalam, and Arabic translations with complete fallbacks.
- Separate UI language from timezone and currency. Support localized numbers/dates, pluralization, 12/24-hour preference, international addresses, phone country codes, and long Unicode names.
- Use logical CSS properties for right-to-left layouts; verify mixed Arabic/numeric content and Quran text direction.
- Preserve the existing theme system and test mobile, keyboard access, contrast, focus, screen-reader states, reduced motion, and both themes.
- Add per-center titles, descriptions, canonical URLs, and share metadata. Evaluate prerendering/server rendering for search indexing; client routing alone should not be assumed to provide crawler-visible center content.

## Migration and release sequence

1. Inventory records, financial totals, staff assignments, public URLs, forms, and hard-coded center values. Back up data and rehearse in staging.
2. Keep `masjids/main` as Cherukunnu's immutable ID. Add its profile and a unique slug such as `cherukunnu-salafi-center`; verify its coordinates.
3. Review current role assignments, migrate trusted memberships, and stop using editable profile roles for authorization.
4. Build sanitized finance projections before switching public queries. Do not temporarily open private ledgers to anonymous readers.
5. Introduce route-based center resolution, then update every consumer to pass the center ID. Remove automatic `main` defaults after all callers migrate.
6. Redirect legacy `/tv`, `/forms/:formId`, and `/admin/*` URLs to Cherukunnu's scoped routes. Map `/superadmin` to the new platform experience and preserve explicit document links. Keep `/quran` shared.
7. Turn `/` into the platform home with an obvious Cherukunnu link. Verify bookmarks, QR codes, and TV destinations.
8. Pilot Cherukunnu and at least two additional centers with different currencies, timezones, and languages.
9. Release backend, rules, indexes, and frontend in a rehearsed compatible order. Enable public onboarding only after isolation and pilot checks pass.
10. Make migrations repeatable with logs. Roll back feature exposure without deleting newly created center data or restoring insecure rules; reconcile totals after rollout or rollback.

## Implementation phases and gates

| Phase | Deliverables | Exit condition |
| --- | --- | --- |
| 1. Audit | Field inventory, permission matrix, routes, migration mapping | Baseline counts/totals captured; public/private contracts defined |
| 2. Center foundation | Trusted memberships, provisioning, slug registry, resolver, explicit data-service IDs | Two test centers isolated; escalation tests pass |
| 3. Administration | Settings, request tracking/review queue, invitations, center switcher, private previews and revision history | A center can be configured without source edits; review/resubmission and restoration work |
| 4. Public platform | Directory, scoped public pages, safe financial projections, scheduled/expiring announcements | Signed-out visitors can browse each center independently; drafts stay private and notices expire |
| 5. Worldwide behavior | Prayer timezone logic, currencies, localization, RTL, offline-resilient TV, themes | India, daylight-saving, Arabic, offline restart, and reconnection scenarios pass |
| 6. Migration and launch | Compatibility redirects, reconciled data, pilot rollout, monitoring | Existing Cherukunnu records and links remain usable |

Keep the React/Firebase stack. Add a trusted backend for provisioning, memberships, public aggregation, and controlled submissions; select/configure its runtime during phase 2.

## Worldwide acceptance criteria

- Announcements appear only during their published window and expire on public pages and TV without a reload, including offline displays.
- Authorized admins can preview, publish, and restore content revisions without exposing drafts, bypassing permissions, losing concurrent edits, or rewriting financial ledgers.
- Applicants can track requests, read correction/rejection reasons, and resubmit corrections; the super-admin queue and applicant status agree even if notifications fail.
- A previously loaded TV display survives an offline restart with valid cached data, handles local midnight and expired notices, and refreshes automatically after reconnecting. Missing current-day data is clearly identified.
- A new center can be added and published without code changes or a separate deployment.
- Registration requests appear in **musthafaak56@gmail.com**'s super-admin inbox and trigger retryable email notifications. Approval, rejection, and requests for correction are recorded.
- Only the approved request's designated admin email receives the initial center-admin grant after verified sign-in; test differing submitter/admin emails, new accounts, pending verification, and repeated approval attempts.
- Initial prayer times come from the supplied center location. Both center admin and super admin can save positive, negative, and zero per-prayer offsets; unauthorized users cannot.
- Verify offsets persist across dates and refreshes, never compound, correctly handle midnight boundaries, and produce identical times across public pages and TV. Explicit manual timetables must not receive offsets twice.
- Public center links show the correct prayers and published finances without login.
- Staff cannot access another center's private records or grant themselves privileges, including through direct requests.
- Switching centers cannot display stale data or submit a form to the previous center.
- Home, monthly views, posters, and TV use the same published schedule.
- Test center midnight, different visitor timezone, daylight-saving transitions, high-latitude settings, missing/future schedules, and provider outage.
- Verify INR, USD, a zero-decimal currency, and a three-decimal currency without precision loss or mixed-currency totals.
- Verify financial projections after edits, deletes, and repeated aggregation attempts; inspect anonymous responses for private data.
- Verify Arabic RTL, Malayalam, long names, international addresses, 320px mobile layouts, keyboard access, and light/dark themes.
- Preserve Cherukunnu's financial totals, forms, responses, staff access, bookmarks, and QR destinations.
- Keep shared Quran preview/video export in regression coverage. This platform plan does not claim to resolve the earlier video-export issue.
- Paginate directory/activity queries, add required indexes, avoid downloading entire ledgers on public pages, and monitor database costs and aggregation failures.
- Run security/backend tests, relevant UI checks, lint, and production build before release; track pre-existing warnings separately.

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

- Preserve a visible, accessible theme toggle in the global header.
- Default to the user’s saved choice. For a first visit, follow `prefers-color-scheme`.
- Apply the theme to the document root using `data-theme="light"` / `data-theme="dark"`, persist it in `localStorage`, and set `color-scheme` accordingly.
- Ensure focus rings, borders, disabled states, tables, empty states, and input backgrounds are designed for both modes—not merely colour-inverted.
- Respect `prefers-reduced-motion`; theme changes should be immediate or use a very short, non-essential transition only.
