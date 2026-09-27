# Worldwide platform rollout

## Local implementation

Public directory and scoped center URLs, preferred-center navigation, request review/status tracking and invitation renewal, verified-email invitations, server-owned roles, staff role changes and ownership transfer, location-based prayer calculations and signed offsets, manual timetables, monthly printing and prayer posters, private finance ledgers with opening balances/reversals/reconciliation, public report history, expiring announcements and private archives, revision previews/restoration, and TV offline caching are implemented in the workspace. Center branding, contacts, module visibility, clock format and Hijri adjustment are configurable. Events store UTC instants plus local recurrence rules; center pages receive server-generated search/share metadata.

## Required production configuration (not performed automatically)

Enable **Email/Password** in Firebase Authentication → Sign-in method before releasing the email registration flow. Keep Google available as an alternative. Configure authorized domains and verification/password-reset email templates for the deployed site. Verify real inbox delivery in staging. Account creation alone never grants management access: the email must be verified and then receive an approved membership or accept a matching invitation. Center notification emails additionally require the SMTP setup below.

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
- `centerPage` supplies escaped center identity, description, canonical URL and Open Graph image metadata using the deployed `/index.html` shell. Set `SITE_URL` to the actual Hosting origin. Dynamic schedules remain client rendered. Preview/staging should use its own matching origin. Legacy event records retain their local values until edited and republished; new records store both UTC and local recurrence fields.
- Finance uses the plan's summary-only option. Published report history contains cumulative snapshots at publication, not additive monthly balances. Private ledgers remain private; corrections retain the original record and add an explicit reversal. Reconciliation reads every ledger entry, never the limited recent list.
- Branding uses validated HTTPS image URLs. File uploads are not introduced, so no storage permissions are opened. Branches remain separate centers as specified in the plan.
- The public prayer/finance/announcement experience has English, Malayalam and Arabic resources, English fallback, localized values and RTL. Some administrative/directory text remains English. Full reviewed interface translations remain outstanding; do not label localization acceptance complete.
- Draft publishing checks both the live version and the exact preview token. Another editor replacing a draft cannot cause a user to publish unseen content. Date-specific manual times are validated against the center timezone, including nonexistent DST wall times.
- Prayer/manual drafts also capture the center settings version. A location or timezone change invalidates a previously reviewed schedule draft until it is previewed again.
- Announcements stop displaying at expiry immediately. The scheduled archival task runs every 30 minutes, moving expired records into the private archive; expired notices are reused as a new draft with new dates.
- TV caches only public data and the app shell. It can expire cached announcements while offline but cannot learn about withdrawals until it reconnects. The cache is scoped to the center and lasts at most seven days; current-day schedule coverage is required.
- Preview restoration creates a new revision. Financial restoration is deliberately prohibited; correcting ledger history must use explicit adjustments.
- Pilot testing and production financial reconciliation are mandatory before considering phase 6 complete.

## Latest verification and remaining acceptance

Domain tests cover signed offsets, manual precedence, midnight transitions, DST, currency precision, expiry and safe metadata. Backend emulator tests cover designated-email approval, replay safety, draft isolation/tokens, manual publishing, reversal/reconciliation and ownership transfer. Rules tests cover anonymous public browsing, private drafts/ledgers and forged profile/role writes. Real local HTTP checks additionally pass for verified sign-in, session memberships, audited administration, exact-draft publishing and center metadata (`functions/scripts/smoke-local.mjs`, emulator-only). Build and lint pass, with remaining lint warnings documented by the tools. Browser checks used Dubai, London and Arabic demonstration centers, including public finances, RTL TV, monthly timetables and poster preview.

Still requiring release-environment verification: real SMTP delivery, App Check tokens, Hosting rewrite/metadata against the deployed origin, native poster download, full TV offline restart/reconnection on the target device, keyboard/contrast checks across all screens, reviewed translations, and migrated Cherukunnu totals. These are not claimed as completed by local unit tests.

Firebase CLI 13 supports the installed Java 11 Firestore emulator, but its Functions runner is incompatible with Firebase Functions SDK 7. Run Auth/Firestore with CLI 13 and Functions with current CLI separately (passing both local emulator host variables), or use current CLI for everything with a supported Java installation. Never point the test runner at production.
