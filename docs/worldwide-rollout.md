# Worldwide platform rollout — Spark-only

Released on 11 October 2026 to https://salafic.web.app. Firebase confirmed successful deployment of Rules, indexes, and Hosting without Functions. The live landing page was checked in the browser. All 18 domain/map/Rules/Spark workflow tests passed; build and lint passed with existing warnings. React Doctor reported no issues in the changed files (project score 64/100; not a claim of full-project health).

## Release architecture

Use classic Firebase Hosting, Authentication, and the default Standard Firestore database. `firebase.json` deploys only Hosting, Rules, and indexes. No Cloud Functions, Cloud Scheduler, SMTP, Storage uploads, or paid Maps API is required. Pure helpers in `functions/` are imported by the browser; the historical server runtime is not deployed.

Registration, review, invitation claims, team management, drafts, publishing, and finance use browser transactions. Firestore Rules enforce verified-email access, center isolation, immutable ledgers, linked invitation/member/index transitions, public/private separation, and bounded payloads. User profiles never grant roles.

## Registration and access

The verified production UID for `musthafaak56@gmail.com` already has the super-admin role. Requests appear in `/platform`. Applicants track decisions/corrections in My requests. Approval creates a draft center and a pending owner invitation for the designated admin email, which may differ from the submitter. The verified matching recipient signs in and accepts it from My requests. Owners invite administrators, finance staff, and content editors, who also accept from My requests. There are no automatic center-related emails: tell invitees to sign in using the exact invited email. Standard Authentication verification/reset emails remain supported.

Registration uses full Google Maps pin/place URLs. Open shortened share links first, then copy the browser URL. Local extraction determines coordinates and timezone. Camera-only/search links are rejected. Latitude/longitude fields are not shown. Location-derived prayers and positive/negative minute offsets remain available.

Sidebar dashboards, public prayer/finance pages, madrasa/committee pages, and management forms remain available. The landing page and center search are preserved. Committee listings never grant staff permissions.

Verified signed-in platform administrators and center staff retain management navigation across all routes, including the landing page, directory, Quran, and account pages. Desktop uses a persistent sidebar; mobile uses a sticky Navigation control. Center links stay capability-scoped, multiple-center staff can switch centers, and signing out removes the management shell. Existing dashboard pages do not render a second sidebar. Isolated browser checks cover desktop/mobile home navigation and sign-out; navigation regression tests cover platform, owner, admin, and finance roles.

The management sidebar intentionally excludes public directory and Quran links; these remain in the public header. Platform controls and an active center's workspace are grouped separately, with a compact account/sign-out area at the bottom. On mobile the account action is available inside the expanded Navigation menu. Administrative links and sign-out are not duplicated in the public header for users with the management shell.

### Superadmin direct center creation

In Centers & masjids, choose Create center / masjid, enter the center details
and full Google Maps pin/place URL, then choose Create draft center. A verified
superadmin can create and manage the center immediately, without submitting an
application or accepting a self-invitation. Use Team to add other administrators
and Settings to publish; creation alone does not make the center public. The
application, approval and invitation flow for other users remains unchanged.

The browser transaction atomically creates the private draft, unique slug
reservation and audit record. Authorization requires a verified account with a
`superadmin` record in `platformRoles`, not merely a matching email address.
Implementation is scoped to `PlatformAdmin.jsx`, shared `CenterFields` in
`PlatformUI.jsx`, `sparkActions.js` and `firestore.rules`.

This Operate-mode extension reuses the existing inline form, white/blue styling
and dark-theme tokens without new CSS or a global product/design-system change.
The scoped desktop/mobile review disposition is ship; a development-only warning
overlay covered one City label, which is not a production UI obstruction. Local
verification reports 32 passing tests, including the existing approval flow,
forbidden roles, duplicate slugs, schema validation and draft privacy. This
evidence does not establish production deployment or replace the release gates
below.

## Deliberate free-plan limits

- Editors allow 8 madrasa classes, 12 committee members, and 4 form questions, with 10 choices per question and 20 choices total.
- Public forms permit bounded create-only submissions; responses remain private. No server-side per-IP rate limiter is available. Abuse can consume the free quota. Optional App Check is not claimed enabled or equivalent to rate limiting.
- Announcements stop displaying at expiry, including offline TV. No scheduled job moves them into a separate archive.
- Hosting serves a generic app shell. Center identity is browser-rendered; server-generated per-center social/search metadata is not provided.
- Finance operators are trusted for aggregate state. Transactions version-check totals, reconcile all ledger entries, and publish sanitized snapshots. Rules restrict access and ledger rewriting but do not independently calculate sums. Client audit rows are not server-certified evidence.
- Spark quotas are finite; exceeding a quota may interrupt service. No billing upgrade is required or enabled by this deployment.
- Branding uses HTTPS image URLs, not Storage uploads. External hosts have their own availability/privacy considerations.

## Production configuration and data safety

### Private Education workspace

Each center now has `/c/:slug/admin/education` for Classes, Teachers and Students.
Verified superadmins, center owners and admins can add/edit records and view
class rosters; content editors, finance staff and visitors cannot access them.
Madrasa students require exactly one madrasa class. Center students require one
or more center classes and cannot join madrasa classes. Teachers can be added
without an assignment or assigned to either program. A record supports up to
six class assignments, keeping relationship validation within Firestore Rules
document-access limits. There is no total-class limit in this workspace.
Class and student program types cannot change after creation. Deletion is not
offered, preserving enrollment references. Names and assignments live in private
subcollections, not the published center document. Public Madrasa information
remains a separate editor. Adding a teacher/student does not grant sign-in access.
Use `tests/education.test.js` for enrollment, version-conflict, schema and role
checks; `scripts/preview-education.mjs` seeds synthetic data only in demo-salafic
on local emulators, never production.

The workspace preserves the established white/blue dashboard and its dark theme:
flat Classes/Teachers/Students tabs, searchable divided record lists, an inline
add/edit form and inline class rosters. Mobile stacks record actions and uses
single-column class assignments. Colors inherit the existing theme tokens;
dark-theme primary buttons use contrasting dark text through an Education-only
override, leaving shared button styling unchanged. The review handoff is ship
with that material contrast fix resolved. No raster assets are part of this UI;
screenshots are review evidence only.

The Hifdh extension adds optional private teacher/student phone numbers, entered
with country code and normalized to 7–15 digits. Center classes can have a next
session date, same-day start/end times, a default student duration of 1–240 whole
minutes, and a gap of 0–240 minutes. Each student's duration and position can be
edited in the class roster. Slots follow the saved order, with name and record ID
as tie-breakers; publishing rejects slots that exceed the class end time.

The public `/c/:slug/hifdh` page is an explicitly published projection, not a
public read of Education records. The browser encrypts only the class/session
details, student IDs, names, order and assigned times, plus a publication key,
using AES-GCM with a password-derived key. Phone numbers never enter that payload.
The initial shared password is `october` and administrators can change it; use
the same password for the center's published Hifdh classes. Publicly readable
documents contain ciphertext and crypto/session metadata. This shared-password
gate is not identity authentication, and a weak shared password can be guessed
offline. Administrators explicitly Publish or Unpublish each class and must
publish again after roster/timing changes or choosing the next week's date.
The next session is administrator-selected, not automatically recurring.

Attendance confirmation checks the submitted number against the student's
private registered phone, current enrollment, publication key/date and a future
session start. Confirmation records remain private to Education managers, and
confirmation closes once the session starts. Matching a known phone number is
not SMS proof of possession or rate-limited identity authentication. No SMS,
Cloud Functions, scheduler, or new paid service is introduced: the extension
retains Firebase Spark-only browser writes and Firestore Rules enforcement.

This is an Operate-mode extension of the existing flat white/blue workspace and
dark-theme tokens, not a replacement design system. It uses divided ordered
rosters and inline editing. Minute controls are numeric-text fields with minus
on the left and plus on the right. HTML drag-and-drop reordering has labeled
up/down button alternatives and a live position announcement. The public page
inherits the same restrained roster layout, with inline phone confirmation.
The scoped review disposition is ship: screenshot review covered public
desktop/mobile light and dark presentations and the administrator desktop
surface; administrator mobile was source-reviewed only, not screenshot-verified.
The existing unit/Rules tests were extended for this work, with 31 tests passing.
This scoped evidence does not replace the wider release gates below.

Keep Google sign-in enabled. Enable Email/Password if that flow is offered, verify authorized Hosting domains, and test real verification/reset delivery. Account creation grants no center access. Never seed demonstration records into production.

Production `masjids` was empty when inspected on 11 October 2026. No legacy records were migrated or overwritten. If legacy data is later found in another project/export, back it up, reconcile totals, and review staff before importing it. Historical migration scripts require trusted credentials and an explicitly reviewed dry run.

Build using production settings, never `VITE_USE_EMULATORS=true`. Deploy matching Rules, indexes, and Hosting together:

```sh
npm run build
npx firebase-tools@latest deploy --only firestore,hosting --project salafic --account musthafaak56@gmail.com --non-interactive
```

Do not deploy historical Functions code or restore old permissive Rules as a rollback.

## Verification and remaining gates

Use isolated Auth/Firestore emulators for domain, map, Rules, and Spark tests. `tests/spark.test.js` checks approval/claim replay protection, roles, private drafts/tokens, publishing, reversals/reconciliation, ownership transfer, public responses, offline Maps extraction, and maximum editor sizes. Negative malformed direct writes must fail, including for super-admin users. Run lint, production build, and the React Doctor changed-file regression check.

Local preview uses `VITE_USE_EMULATORS=true` with a `demo-` project only. Never point synthetic tests at production.

Reviewed English/Malayalam/Arabic interface translations, comprehensive keyboard/contrast checks, native poster/video downloads, target-device TV offline restart/reconnection, real Authentication inbox delivery, and real-center pilots remain outstanding. The shared Quran export issue is not claimed fixed by this platform conversion. Verify real invitation acceptance and financial reconciliation before marking worldwide rollout complete.
