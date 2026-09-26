# Worldwide platform rollout

## Local implementation

Public directory and scoped center URLs, request review, verified-email invitations, server-owned roles, location-based prayer calculations and signed offsets, private finance ledgers with reviewed public summaries, announcements, revision previews/restoration, and TV offline caching are implemented in the workspace.

## Required production configuration (not performed automatically)

1. Back up the existing Firestore database. Record current ledger totals and staff assignments. Freeze legacy writes during migration/reconciliation.
2. Use a staging Firebase project first. The existing project uses the `(default)` Standard database. The functions require a supported billing/runtime configuration.
3. Install backend packages with `npm ci --prefix functions`. Configure `SMTP_HOST`, `SMTP_FROM`, and `SITE_URL` parameters; set `SMTP_USER` and `SMTP_PASSWORD` with Firebase secret management. No credentials belong in source control. Outbox rows remain private; failed messages retry up to eight times and then require operator review.
4. Configure Firebase App Check (reCAPTCHA v3) and set `VITE_RECAPTCHA_SITE_KEY`. Anonymous form submission enforces App Check and rate limiting. Do not release forms without this configuration.
5. Run `GCLOUD_PROJECT=<staging-project> node functions/scripts/bootstrap.mjs` as a trusted operator with Application Default Credentials. The script resolves `musthafaak56@gmail.com` through Firebase Auth and requires a verified enabled account. Inspect the dry run, then use `--apply` to provision the server-owned role.
6. Rehearse `functions/scripts/migrate-cherukunnu.mjs` in staging. It defaults to dry run. Confirm coordinates before using `--apply --coordinates-confirmed`. It preserves subcollections and records reconciliation totals; it does not infer trustworthy staff roles from historically editable profiles. Re-invite reviewed staff explicitly through the team page.
7. Deploy backend, rules, and indexes during a controlled migration window, then release the matching frontend. New rules deliberately block legacy direct operational writes. Deploying only half this release breaks the old application; do not roll back to the old insecure rules.
8. Review and publish the first financial summary from the migrated private ledger. Then pilot additional centers in different currencies/timezones and Arabic RTL before enabling broad registration.

## Verification commands

- `node --test tests/domain.test.js`
- `npx firebase-tools@13.35.1 emulators:exec --project demo-salafic --only firestore 'node --test tests/rules.test.js'` (Java 11-compatible local runner)
- `npm run lint` and `npm run build`
- For a local app using emulators, set `VITE_USE_EMULATORS=true` and use an isolated test Firebase project. Never seed test data into production.

## Operational notes and remaining launch gates

- Email delivery, super-admin provisioning, live migration, production release, and center-owner acceptance require the production configuration above; they have not been performed by editing the code.
- Language support currently translates the public prayer/finance headings and locale-sensitive values. Full reviewed English/Malayalam/Arabic interface translations remain a launch gate.
- The directory is a client-rendered SPA. Per-center titles are updated, but server-rendered crawler metadata and share images are not included yet.
- The first finance release publishes summaries; public itemized transactions, historical-period reports, ledger corrections, and opening-balance editing require additional work.
- Ownership transfer, center logos/uploads, multiple branches, and staff role changes beyond invitation/removal are not yet implemented.
- Public event dates retain the existing local-wall-time format. Full UTC migration, recurring-event DST resolution, monthly schedule UI and center poster generation still need completion.
- Manual date-specific prayer records from the existing database are respected. A new manual timetable editor and complete preview of those records remain to be implemented; the current admin prayer screen manages recurring calculation settings/offsets.
- TV caches only public data and the app shell. It can expire cached announcements while offline but cannot learn about withdrawals until it reconnects. The cache is scoped to the center and lasts at most seven days; current-day schedule coverage is required.
- Preview restoration creates a new revision. Financial restoration is deliberately prohibited; correcting ledger history must use explicit adjustments.
- Pilot testing and production financial reconciliation are mandatory before considering phase 6 complete.
