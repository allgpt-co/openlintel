# Marketing launch and activation runbook

## Verified infrastructure state — 2026-09-15

Read-only GitHub API inspection confirmed `allgpt-co/openlintel` Pages uses `main:/docs` (`build_type: legacy`, status `built`), with custom domain `openlintel.com`. The returned site URL was HTTP, `https_enforced` was false, and `https_certificate` was null. Public DNS-over-HTTPS returned no apex A/AAAA answers and NXDOMAIN for the www CNAME query. A built Pages status is **not** evidence that the current local revision is deployed or reachable.

The implementation has not changed DNS, purchased services, created analytics properties, submitted a sitemap, enabled a real form, sent outreach, or certified editorial content. No usable Cloudflare credential, verified Formspree ID, OpenLintel GA4 measurement ID, or operational contact was available. The shared environment's generic analytics properties must not be reused.

## 1. Ownership and DNS

1. Assign a domain/Pages administrator, privacy owner, lead owner and backup, and editorial reviewer. Confirm the actual domain and repository ownership.
2. Verify the custom domain in GitHub before creating DNS records. Keep the existing `main:/docs` publishing source; do not switch the app deployment workflow.
3. Following GitHub's current documentation, configure the apex A records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`; set `www` CNAME to `allgpt-co.github.io` (no repository path). Check for conflicting records rather than deleting unrelated DNS settings. Start DNS-only if using Cloudflare until GitHub validates domain/certificate issuance.
4. Wait for propagation and certificate provisioning. Enable Enforce HTTPS only once a valid certificate is available. Recheck HTTPS and HTTP/www/default-host deep-link normalization.
5. Do not claim availability until `marketing:production-check` passes against the deployed build.

Reference: [GitHub custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

## 2. Managed pilot intake

The source implements a native HTML Formspree POST, with progressively enhanced feedback. Production form acceptance must not depend on the product app, client authentication, or GA4 consent.

Before enabling:

- Create a company-owned Formspree form and verify the notification address.
- Review service limits, processing terms, abuse protection, allowed domains, notification permissions and deletion procedures.
- Set the native success redirect to `https://openlintel.com/pilot/thanks/` in Formspree. A GET of this page is not proof of successful submission and must never emit a lead conversion by itself.
- Test accepted, rejected, timeout, duplicate-click and no-JavaScript requests using a separate test form. Mark/remove test records from operational reporting.
- Import `lead-register-template.csv` into a restricted-access Google Sheet. Do not publish it or commit actual rows. Record Formspree's durable submission ID as `lead_id` and reconcile daily, even if email notifications appear reliable.
- Name a daily request owner and backup; aim to respond within one business day. Qualify and schedule manually; do not auto-enroll contacts in email campaigns.
- Review collection purposes, access, inactivity/retention review and deletion in the privacy notice before collecting data. Add a real contact email; do not invent a business identity or compliance assertion.

Public build-time configuration (not secret credentials):

```sh
export MARKETING_CONTACT_EMAIL='<verified operational email>'
export MARKETING_FORMSPREE_ID='<verified form ID>'
export MARKETING_FORMSPREE_VERIFIED=1
export MARKETING_OPERATIONS_READY=1
export MARKETING_PRIVACY_REVIEWED=1
export MARKETING_PILOT_ENABLED=1
```

An unconfigured build intentionally shows availability information rather than a broken or simulated form. Setting readiness flags is an attestation that the operational checks were actually completed, not a substitute for them. Never put Formspree API keys in static HTML or this repository.

## 3. Search Console and GA4

1. Obtain access to an existing OpenLintel property if it exists. Otherwise establish a dedicated domain property `sc-domain:openlintel.com` and verify via the appropriate DNS record.
2. Submit `https://openlintel.com/sitemap.xml` after the production audit passes. Inspect the home, a hub, a guide, a template, and the pilot page; confirm the print summary/confirmation are intentionally excluded.
3. Obtain or create a dedicated OpenLintel GA4 web stream. Check its default website URL and data owner. Disable the entire enhanced-measurement feature, including automatic page/form/download/history/scroll interactions; keep Google Signals and advertising features off for this v1.
4. Use the Google tag's basic opt-in behavior. No Google script, event or consent ping before acceptance. Denial must not stop reading, downloads or form submission. Test withdrawal and cross-tab updates with the browser network panel.
5. Validate the actual Google tag in the isolated analytics frame on the verified HTTPS domain: correct property/stream and hostname, page location, categorized acquisition, cookie continuity, engagement behavior, and withdrawal without further requests. Test supported browsers; mocked tests do not validate Google’s real runtime.
6. Verify `generate_lead` only after accepted AJAX submission, not a CTA, thank-you URL or failed request. Set it as a GA4 key event; keep downloads as microconversions. Do not assign made-up currency values or call them qualified leads.

```sh
export MARKETING_GA4_ID='<verified G- measurement ID>'
export MARKETING_GA4_VERIFIED=1
export MARKETING_ANALYTICS_ENABLED=1
# Also requires real MARKETING_CONTACT_EMAIL and MARKETING_PRIVACY_REVIEWED=1.
```

Analytics refusal means some journeys remain unknown. Do not replace missing consent with fingerprinting, covert storage, server-side bypass collection, or falsely attributed source history.

## 4. Build, review and publish

```sh
npx --yes pnpm@9.15.4 marketing:lint
npx --yes pnpm@9.15.4 marketing:check
npx --yes pnpm@9.15.4 marketing:build
npx --yes pnpm@9.15.4 marketing:preview
# In a second terminal; use the documented browser executable if necessary:
npx --yes pnpm@9.15.4 marketing:smoke
npx --yes pnpm@9.15.4 marketing:growth-smoke
node apps/marketing/production-check.mjs --url http://localhost:4173/
git diff --check
```

The browser smoke suite checks the disabled/public build. The growth smoke suite uses a temporary configured build and intercepted network requests; it must not send real leads or Google collection requests. A passing mocked suite is not proof of real Formspree delivery or Google property configuration.

Before publication: complete truthful claims review, review the generated diff, confirm no credentials or private operation files entered `docs/`, and commit reviewed source plus generated output together. Since Pages currently serves checked-in `docs/`, environment changes only take effect after rebuilding and publishing the new output. Mirror the reviewed public `MARKETING_*` integration values in same-named GitHub repository Actions variables before activating them. The quality workflow compares its disposable build byte-for-byte with checked-in Pages artifacts and fails on stale output or mismatched release configuration; these variables are public IDs/readiness settings, never OAuth tokens or provider API keys. The application deployment workflow is left untouched; the marketing quality workflow performs checks, not deployment.

The generator records owned file hashes. Retired unchanged generated files can be cleaned only when the prior manifest proves ownership. Legacy manifests without hashes cannot authorize cleanup, and modified files are preserved. When renaming a route, establish its HTTP redirect separately on the actual host; GitHub Pages does not provide a general per-route server redirect configuration. Do not silently replace redirects with a JavaScript hop.

For public previews build with `MARKETING_NOINDEX=true`; use access controls for confidential previews. The local server adds noindex headers as an additional safeguard. Production builds must not inherit preview noindex settings.

After publication:

```sh
npx --yes pnpm@9.15.4 marketing:production-check
```

This GET-only audit compares deployed files to the reviewed manifest hashes, checks canonical/indexing/sitemap behavior, valid Office downloads, real404s and host/deep-link redirects. A DNS failure exits early with a failing status; it is not evidence of zero traffic. Keep audit output private under ignored `output/seo/`.

Record the real release date and deployed commit; do not treat an editorial modification date as first publication. Optional per-page publication metadata may be supplied only after it is established.

## 5. Rollback and monitoring

- DNS/HTTPS unavailable: domain owner investigates immediately; do not compensate with more content.
- Broken form or misrouted notifications: turn pilot intake off, rebuild and republish; keep safe informational content available. Reconcile accepted Formspree records so a lost notification does not lose a lead.
- Privacy/analytics issue: disable analytics, rebuild and republish; review affected processing with the privacy owner. Client-side withdrawal controls are not a substitute for fixing a bad release.
- Revert a failed marketing release and republish the prior reviewed static output. Preserve valid redirects and lead records; never delete lead data as part of a code rollback.
- Run uptime checks for home and pilot daily, check form delivery using designated test records weekly, inspect indexing weekly after launch, and compare complete reporting periods monthly.

Practitioner review, legal/privacy approval, actual pilot outcomes, video production, backlinks and six months of measurement are ongoing human/external work—not automatically completed by this code release.
