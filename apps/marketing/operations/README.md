# OpenLintel SEO operations

These are **internal operating materials**, not marketing assets. The static build must never copy this directory into `docs/`. Templates are blank; no customer, practitioner, analytics, or traffic outcomes have been invented.

- [Launch runbook](LAUNCH.md): verified hosting state, environment configuration, integrations, release and rollback.
- [Six-month execution backlog](ROADMAP.md): responsibilities, content ownership, evidence gates and cadence.
- [September 25 implementation audit](SEO-AUDIT-2026-09-25.md): verified production baseline, Google access limits and research interpretation.
- [Real analytics acceptance](ANALYTICS-ACCEPTANCE.md): pending live-tag tests, including session attribution and foreground engagement.
- [Measurement contract](MEASUREMENT.md): event definitions, source attribution, qualification and reporting.
- [Educational walkthroughs](WALKTHROUGHS.md): two actual captioned website recordings, transcripts, limitations and reproduction.
- `lead-register-template.csv`: schema for the restricted-access lead register; never add real leads to this repository. Keep exports under ignored `output/seo/` or outside the workspace.
- `editorial-review.csv`: all review assignments are pending. Only a real reviewer can record an actual review and its scope.
- `outreach-register-template.csv`: record relevant, individually evaluated contacts. No unsolicited outreach has been sent by the implementation.

Google Sheets import should treat contact/challenge/website cells as **plain text**, not formulas. Do not allow public links, shared-drive defaults that expose leads, or automatic newsletter subscription. Preserve the Formspree submission ID for reconciliation; a notification email is not the durable acceptance record.

Before public collection, the operations owner must name the request owner, activate the form, verify delivery, review vendor processing and data retention with the privacy owner, and maintain access/deletion procedures. These dependencies cannot be established by setting an environment flag alone.

## Private working register — September 19, 2026

A native Google Sheet named **OpenLintel SEO Operations — Private** was created in the connected owner's private ChatGPT folder. Owner-only sharing was verified; no public link permission or additional collaborator was added. It contains Instructions, Leads, Editorial Review, Launch Checklist, and Outreach tabs, native tables and status dropdowns. Leads and Outreach are empty; all thirty editorial entries remain pending and not release-approved. The private URL is delivered separately, not embedded in public source or marketing output.

Provisioning a spreadsheet completes the register setup, not operational readiness. Assign real owners and backups, review retention/access, and grant only the necessary people access before any collection. Do not duplicate the register blindly from the CSV. Keep raw provider IDs and observed source evidence separate from human qualification and attribution decisions.

## September 26 follow-through

The September 25 audit confirms DNS/HTTPS and production routes now work; historical blocked rows need the dated evidence, not another DNS setup. Keep implementation, deployment, real-provider validation and business outcomes distinct when updating statuses. Retain all existing unrelated checklist entries and actual completion dates. Do not mark any of the 30 professional reviews complete without a real review. Assign a private stable `studio_id` manually for deduplication; never guess studio identity from a personal email domain.
