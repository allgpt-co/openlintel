# Real analytics activation acceptance

Status: **not performed — verified OpenLintel property/stream access unavailable**. Mocked browser tests verify our event and consent logic, not Google's processing. Complete this record on the reviewed HTTPS release before treating GA metrics as reliable. Never insert credentials or personal lead data in the repository; store detailed evidence privately.

## Prerequisites and record

Record the operator, date/timezone, deployed revision, verified property/stream identity, browser/version, GA activation date and private evidence location. Verify the stream website and live hostname, disable enhanced measurement and advertising features, register the event dimensions in MEASUREMENT.md, and use clearly designated test records excluded from business reporting. A public contact in site copy is not proof of lead coverage or a privacy/operations approval.

| ID | Scenario | Acceptance evidence | Result |
| --- | --- | --- | --- |
| A1 | New browser, no consent; then reject | No Google tag/measurement/consent network requests; reading, files and form remain usable | pending |
| A2 | Accept on a verified page | Exactly one intended page view reaches the verified stream/hostname; sanitized canonical page URL, no contact/query/fragment fields | pending |
| A3 | Search landing → template → sample → pilot | Same intended session/client continuity; correct landing page and processed session source/medium; internal navigation does not become a new direct acquisition | pending |
| A4 | Later direct entry | GA session attribution and first-known browser organic evidence remain separately interpretable; no invented pre-consent history | pending |
| A5 | Foreground reading, background tab, return, navigate | Actual user_engagement/engagement_time_msec reflect focus/foreground behavior; compare parent interaction with hidden analytics-frame lifecycle | pending |
| A6 | Download each known format and variant | One resource_download per initiated download, correct allowlisted resource/format/variant; no duplicate enhanced-measurement event | pending |
| A7 | Begin form; valid AJAX acceptance | One form start and one generate_lead only after provider acceptance; private durable receipt exists; no answers/contact data in GA | pending |
| A8 | Rejection, timeout, duplicate click, direct thanks URL | Honest failure feedback; no fabricated acceptance/key event; duplicate click cannot duplicate accepted browser event | pending |
| A9 | Native no-JavaScript form | Provider records acceptance and expected redirect; no browser GA event is invented | pending |
| A10 | Withdraw, other open tab, expiry and unavailable storage | No later Google requests; frame/cookies/attribution removed as designed; site functions remain usable | pending |
| A11 | Processed reports after normal processing delay | Intended source/medium, landing, explicit generate_lead and custom resource dimensions visible; thresholds/timezone recorded | pending |

Check both Chrome and Safari (including mobile) and record browser-specific limits. DebugView/realtime receipt alone does not prove final session attribution. Do not send production leads for automated smoke tests; use a separate test form for error-path coverage.

## Release decision

Release analytics only when the intended behavior is supported by the real checks. If internal-navigation campaign configuration changes attribution, correct it and repeat A3/A4/A11. If the frame cannot provide reliable foreground engagement, correct the implementation and repeat A5 before using engagement metrics; do not paper over the problem with invented custom engagement. Preserve the no-collection-before-consent and withdrawal guarantees in any fix.

Record actual results and remaining limitations; never replace `pending` with `passed` based on source inspection. Intake may operate independently of analytics once its own delivery/ownership checks pass. Roll back analytics by disabling its build flag, rebuilding and publishing reviewed output; keep the monitored intake and resource library available.
