# Dependency security status and follow-up

## Scope and evidence — September 19, 2026

This is a **targeted remediation, not full security clearance**. Passing the
existing critical-severity gate does not mean the application is free of
vulnerabilities or ready for unrestricted production use. Package presence in an
audit also does not prove that every vulnerable code path is reachable.

The repository-wide `pnpm@9.15.4 audit --json` snapshot after the changes reported:

| Severity | Reported count |
| --- | ---: |
| Critical | 0 |
| High | 37 |
| Moderate | 43 |
| Low | 8 |

These are npm audit summary counts, not a count of distinct affected packages or
a Trivy result. Databases and severity assessments change; rerun both scanners
against the release commit. The existing Trivy blocking gate, advisory report,
severity settings, and exclusions were not weakened. No advisory was ignored and
no dependency override was added by this remediation.

### Changes included

| Dependency | Previous resolved version | New resolved version | Maintainer reference |
| --- | --- | --- | --- |
| Next.js | 15.5.12 | 15.5.25 | [15.5.24 security fixes](https://github.com/vercel/next.js/releases/tag/v15.5.24), [15.5.25 follow-up](https://github.com/vercel/next.js/releases/tag/v15.5.25) |
| next-auth | 5.0.0-beta.30 | 5.0.0-beta.32 | [Release and fail-closed fix](https://github.com/nextauthjs/next-auth/releases/tag/next-auth@5.0.0-beta.32) |
| @auth/drizzle-adapter | 1.11.1 | 1.11.3 | [Adapter release](https://github.com/nextauthjs/next-auth/releases/tag/@auth%2Fdrizzle-adapter@1.11.3) |
| @auth/core, transitive | 0.41.0 and 0.41.1 | 0.41.3, shared by both consumers | [Auth.js security advisories](https://github.com/nextauthjs/next-auth/security/advisories) |
| Vitest, all four consuming workspaces | 2.1.9 | 3.2.7 | [UI/server vulnerability](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp), [3.2.7 additional filesystem fix](https://github.com/vitest-dev/vitest/releases/tag/v3.2.7) |

The Vitest major update was necessary because the affected 2.x version has no
patched 2.x release listed in the advisory. This does **not** resolve the separate
transitive Vite finding below. Authentication application-code remediation and
required deployment/incident actions are documented in [AUTHENTICATION.md](AUTHENTICATION.md).

## Remaining high findings: application/runtime dependencies

The versions below are the installed snapshot and the minimum candidate versions
that cover the listed high findings. They are **not** upgrades already applied or
compatibility sign-off. Recheck current advisories before choosing a final target.
Rows consolidate multiple findings and dependency paths.

| Package / current path | Current → candidate patched floor | Follow-up and primary advisory |
| --- | --- | --- |
| `@trpc/server`, direct in web and shared with client/react-query | 11.0.0 → 11.8.0 | Upgrade all three tRPC packages together within v11; test callers, authorization and serialization. [WebSocket DoS](https://github.com/trpc/trpc/security/advisories/GHSA-pj3v-9cm8-gvj8), [experimental App Router caller](https://github.com/trpc/trpc/security/advisories/GHSA-43p4-m455-4f4j). |
| `drizzle-orm`, direct in web and db | 0.45.1 → 0.45.2 | Update both consumers together; test adapter operations and dynamic identifiers/aliases. [Identifier escaping](https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9). |
| `sharp`, currently brought in by Next; also imported by application upload/image code | 0.34.5 → 0.35.4 | Treat separately from the Next upgrade. Next 15.5.25 retains a `^0.34` range, so a blind transitive refresh will not suffice. Review a supported framework/image dependency combination and declare direct application use explicitly. [libvips findings](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj), [libheif findings](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c). |
| `fast-xml-parser`, through AWS SDK XML builder | 5.3.6 → 5.5.6 | Update the compatible AWS SDK/XML dependency chain; test S3 and Bedrock integrations with mocks and authorized staging credentials. [Entity expansion](https://github.com/NaturalIntelligence/fast-xml-parser/security/advisories/GHSA-8gc5-j5rx-235r). |
| `socket.io-parser`, through web client and collaboration server | 4.2.5 → 4.2.7 | Refresh compatible Socket.IO chains and test binary attachments, limits, reconnects and authorization. [Attachment limit](https://github.com/socketio/socket.io/security/advisories/GHSA-677m-j7p3-52f9), [zero-attachment exhaustion](https://github.com/socketio/socket.io/security/advisories/GHSA-2m8v-j782-fhvr). |
| `engine.io`, collaboration server | 6.6.5 → 6.6.7 | Test both polling and upgraded transports under bounded load. [Polling exhaustion](https://github.com/socketio/socket.io/security/advisories/GHSA-r635-g3xr-vw7x), [WebTransport SID](https://github.com/socketio/socket.io/security/advisories/GHSA-gr94-w7qr-f4j3). |
| `ws`, web client and collaboration transport dependencies | 8.18.3 → 8.21.0 | Refresh supported transport dependencies; test message/fragment limits and disconnect behavior. [Fragment exhaustion](https://github.com/websockets/ws/security/advisories/GHSA-96hv-2xvq-fx4p). |
| `path-to-regexp`, through collaboration Express | 0.1.12 → 0.1.13 | Prefer a supported Express 4 patch/dependency refresh; test routing and malformed requests. [Route-parameter ReDoS](https://github.com/pillarjs/path-to-regexp/security/advisories/GHSA-37ch-88jc-xwx2). |
| `lodash`, through Recharts | 4.17.23 → 4.18.0 | Refresh the compatible dependency and test charts; assess whether template compilation is used rather than assuming runtime exploitation. [Template imports](https://github.com/lodash/lodash/security/advisories/GHSA-r5fr-rjxr-66jc). |

## Remaining high findings: development/build and framework tooling

Development dependencies still matter: CI and developer machines process source
and run code. Do not expose Vite/Vitest development servers to untrusted networks.
Framework-bundled build dependencies may also ship in application artifacts.

| Package / current path | Current → candidate patched floor | Follow-up and advisory |
| --- | --- | --- |
| `vite`, through Vitest | 5.4.21 → 6.4.3 | Select a patched Vite version supported by Vitest 3; test all consumers rather than suppressing the finding. [Windows filesystem deny bypass](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff). |
| `postcss`, direct dev dependency, Tailwind, Vite, and Next | 8.5.6 / 8.4.31 → 8.5.18 | Next pins 8.4.31; a direct dependency bump alone leaves that copy. Validate a framework-supported resolution before considering a narrowly scoped override. [Source map disclosure](https://github.com/postcss/postcss/security/advisories/GHSA-6g55-p6wh-862q), [path traversal](https://github.com/postcss/postcss/security/advisories/GHSA-r28c-9q8g-f849). |
| `nanoid`, through PostCSS | 3.3.11 → 3.3.18 | Refresh compatible 3.x dependencies; review negative/zero/custom size use. [Integer overflow](https://github.com/ai/nanoid/security/advisories/GHSA-xwg4-73v4-xw9w), [negative size](https://github.com/advisories/GHSA-28wg-ghj8-5hjv), [zero size](https://github.com/advisories/GHSA-2v37-7h3g-55p8). |
| `minimatch`, ESLint / typescript-eslint / ExcelJS tooling | 3.1.3 / 9.0.6 → 3.1.4 / 9.0.7 | Keep compatible major lines while refreshing the dependency trees. [Globstar backtracking](https://github.com/isaacs/minimatch/security/advisories/GHSA-7r86-cg39-jmmj), [extglob ReDoS](https://github.com/isaacs/minimatch/security/advisories/GHSA-23c5-xmqv-rm74). |
| `brace-expansion`, through minimatch | 1.1.12 / 5.0.2 → 1.1.18 / 5.0.9 | Preserve each parent's supported major line; rerun lint and marketing document generation. [CPU expansion](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-3jxr-9vmj-r5cp), [memory expansion](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-mh99-v99m-4gvg), [follow-up](https://github.com/juliangruber/brace-expansion/security/advisories/GHSA-rgw5-rvv9-x895). |
| `flatted`, ESLint cache tooling | 3.3.3 → 3.4.2 | Refresh the compatible cache chain. [Recursion](https://github.com/WebReflection/flatted/security/advisories/GHSA-25h7-pfq9-p65f), [prototype pollution](https://github.com/WebReflection/flatted/security/advisories/GHSA-rf6f-7fwh-wjgh). |
| `js-yaml`, ESLint configuration tooling | 4.1.1 → 4.3.2 | Refresh the compatible 4.x chain and validate config loading. [Merge keys](https://github.com/nodeca/js-yaml/security/advisories/GHSA-52cp-r559-cp3m), [ordered maps](https://github.com/nodeca/js-yaml/security/advisories/GHSA-5p4m-2wfm-xmqj), [empty merge sources](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh). |
| `picomatch`, lint-staged and typescript-eslint glob tooling | 2.3.1 / 4.0.3 → 2.3.2 / 4.0.4 | Preserve supported major lines; rerun lint-staged and source discovery. [Extglob ReDoS](https://github.com/micromatch/picomatch/security/advisories/GHSA-c2c7-rcm5-vvqj). |

## Safe follow-up order

1. **Before exposing affected application services**, have the security owner
   assess reachable upload/image processing, database identifier construction,
   tRPC adapters, and collaboration transports. Restrict exposure where a safe
   dependency update is not yet verified. Do not infer that the static marketing
   site runs these server dependencies.
2. Patch direct ORM/tRPC dependencies and supported transport/XML dependency
   chains in small, independently tested changes. Align multi-package consumers.
3. Resolve the Sharp and framework-pinned PostCSS constraints deliberately;
   test image decoding, uploads, optimization and CSS builds on deployment
   platforms. Avoid an unreviewed blanket override or framework major migration.
4. Refresh development/build chains, including Vite, then rerun marketing
   generation, tests, typechecks, production build and both dependency scanners.
5. Review the moderate and low findings separately; this high-severity inventory
   does not dismiss them. Assign owners, deadlines and any explicit risk decision
   in the security tracker. This document does not constitute risk acceptance.

## Validation boundary and reproduction

- Frozen installation with pnpm 9.15.4 passed after the lockfile changes.
- The web suite passed 28 tests, including 13 authentication regressions.
- Shared `core`, `db`, and `ui` typechecks passed. Their existing test commands
  find no test files; no `passWithNoTests` bypass was added.
- The Next.js 15.5.25 production build passed, with optional Sharp package
  warnings. The pre-existing Next configuration skips build-time lint/type
  failures; a successful build is not a clean typecheck.
- An isolated checkout of the pre-change HEAD produced **183 TypeScript errors**.
  The corrected final full typecheck produced **181 existing errors**, with none
  in the authentication sources/tests or sign-in page. The authentication changes
  remove two existing errors; the remaining full-application errors still fail
  the typecheck and must not be represented as a pass.
- Focused authentication typechecks and regression tests complement, but do not
  replace, full-application type safety or a live OAuth/production assessment.

Run from the repository root (audit exits nonzero while findings remain):

```bash
npx pnpm@9.15.4 install --frozen-lockfile
npx pnpm@9.15.4 audit --json
npx pnpm@9.15.4 --filter @openlintel/web test
npx pnpm@9.15.4 --filter @openlintel/web exec tsc -p tsconfig.auth-security.json
npx pnpm@9.15.4 --filter @openlintel/web typecheck
npx pnpm@9.15.4 --filter @openlintel/core --filter @openlintel/db --filter @openlintel/ui typecheck
NEXT_TELEMETRY_DISABLED=1 npx pnpm@9.15.4 --filter @openlintel/web build
```

Use the unchanged repository security workflow for Trivy. Successful source
checks, a commit, or a PR merge do not prove that every running instance has
received the fixes; deployment and verification remain separate actions.
