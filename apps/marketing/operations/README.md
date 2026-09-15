# OpenLintel SEO operations

These are **internal operating materials**, not marketing assets. The static build must never copy this directory into `docs/`. Templates are blank; no customer, practitioner, analytics, or traffic outcomes have been invented.

- [Launch runbook](LAUNCH.md): verified hosting state, environment configuration, integrations, release and rollback.
- [Six-month execution backlog](ROADMAP.md): responsibilities, content ownership, evidence gates and cadence.
- [Measurement contract](MEASUREMENT.md): event definitions, source attribution, qualification and reporting.
- `lead-register-template.csv`: import into a restricted-access lead register; never add real leads to this repository. Keep exports under ignored `output/seo/` or outside the workspace.
- `editorial-review.csv`: all review assignments are pending. Only a real reviewer can record an actual review and its scope.
- `outreach-register-template.csv`: record relevant, individually evaluated contacts. No unsolicited outreach has been sent by the implementation.

Google Sheets import should treat contact/challenge/website cells as **plain text**, not formulas. Do not allow public links, shared-drive defaults that expose leads, or automatic newsletter subscription. Preserve the Formspree submission ID for reconciliation; a notification email is not the durable acceptance record.

Before public collection, the operations owner must name the request owner, activate the form, verify delivery, review vendor processing and data retention with the privacy owner, and maintain access/deletion procedures. These dependencies cannot be established by setting an environment flag alone.
