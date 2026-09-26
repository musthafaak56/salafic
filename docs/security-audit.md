# Center isolation audit

Existing code used `users.role` and `users.masjidIds` while allowing unrestricted owner profile writes. Existing expenses, forms and events were publicly readable as whole documents; donation records were private. All old data helpers defaulted to main.

New contract: clients cannot write operational documents directly. Callable functions validate input and read authoritative platformRoles/members inside transactions before writes. Public center queries require status=published. Private ledgers, applications, drafts, revisions and submissions require scoped access. Public finance is sanitized server-side. User profiles are owner-only and field-restricted. Request submitter and intended administrator are independent identities.

Verification targets: public collection query, cross-center reads/writes, profile role escalation, application approval replay, expired invitation acceptance, permission revocation, unpublished center reads, oversized/invalid payloads, version conflicts, currency precision, financial idempotency, and anonymous submission limits. Automated results are recorded in the implementation handoff after execution.
