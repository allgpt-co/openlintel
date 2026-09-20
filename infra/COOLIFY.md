# Coolify core application release

Keep GitHub Pages marketing at `openlintel.com` (`main/docs`). Deploy the authenticated application at `app.openlintel.com` and Socket.IO at `collab.openlintel.com`.

Use the repository root and `docker-compose.production.yml` in a Git-backed Coolify Compose application. Do not deploy `docker-compose.yml`: it is for local development. The legacy ECR workflow is manual-only and does not deploy the complete stack.

## Configuration

Create a standalone PostgreSQL 16 resource in Coolify, with a persistent volume, no public database port, scheduled daily backups and a tested restore. Put it on the network named by `DATABASE_NETWORK` (default `coolify`). Populate `DATABASE_URL` with its internal hostname and generated credentials. If an existing database is in use, back it up and preserve it; do not recreate or reset it. Existing databases not managed by Drizzle require a schema/baseline review before the migration service runs.

Copy the variable names from `infra/docker/production.env.example` into Coolify. Store values only in Coolify secrets, never in Git or chat. Set independent random `AUTH_SECRET` and `JWT_SECRET` values of at least 32 ASCII characters. Preserve `API_KEY_ENCRYPTION_SECRET` if encrypted API keys already exist. Set a random Meilisearch master key. Configure an existing S3 bucket and AWS credentials/role with access to that bucket and the Bedrock models used by the application. Python vision workflows use a user-provided OpenAI key from Settings. No payment credentials are needed: billing endpoints always reject requests in this release.

Configure at least one complete Google or GitHub OAuth provider. The callback is `https://app.openlintel.com/api/auth/callback/google` or `/github`. Production startup rejects missing OAuth configuration. A preview deployment requires its own callback and origin configuration.

If S3 and Bedrock use different AWS principals, keep the S3 credentials in `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and optional `AWS_SESSION_TOKEN`. Set the separate Bedrock pair in `BEDROCK_AWS_ACCESS_KEY_ID` and `BEDROCK_AWS_SECRET_ACCESS_KEY`, plus `BEDROCK_AWS_SESSION_TOKEN` for temporary credentials. `BEDROCK_REGION` optionally overrides `AWS_REGION`. These Bedrock values are passed only to the web service. If no dedicated pair is set, Bedrock retains the AWS default credential chain; a partial pair is rejected. Verify bucket access and a model call separately using their intended principals.

Set `BUILD_SHA` to the exact merged revision. `NEXT_PUBLIC_COLLAB_SERVICE_URL` is a **build argument** and must be `https://collab.openlintel.com` before building. The manifest passes it to the web build. Changing this URL requires a rebuild.

Map only web port 3000 and collaboration port 8009 to public HTTPS domains. Leave Redis, Meilisearch, Python services and PostgreSQL private. Keep `AUTH_URL=https://app.openlintel.com` and the collaboration `WEB_URL` at the same origin. Enable proxy WebSocket upgrades and verify TLS certificates. Preserve unrelated DNS records. Marketing root DNS must remain pointed at GitHub Pages; application and collaboration records point at the Coolify ingress.

## Release sequence

1. Run Authentication quality, Security Audit, and Container release checks on the PR. Merge only after passing required checks.
2. Record the currently deployed revision, configuration and backup/restore evidence. Check host memory and disk capacity for all services and build layers; avoid disrupting unrelated workloads.
3. Build the exact merged revision in a preview environment. The one-shot `migrate` service applies committed migrations and must exit successfully before web, collaboration or Python services start. Do not use `drizzle-kit push` in production.
4. Verify all long-running containers are healthy, then exercise OAuth login, project and room creation, upload and signed file retrieval, a configured design job, collaboration sync and reload persistence, and billing rejection. Provider actions need real configured credentials; HTTP health alone does not establish them.
5. Deploy the same revision and configuration to production, then verify HTTPS, `/api/health/live`, `/api/health/ready`, `/api/version`, and collaboration readiness. `/api/version` must report the merged SHA and `billingEnabled: false`.
6. Observe three consecutive successful checks at five-minute intervals. Verify `openlintel.com` marketing remains reachable. Record any unavailable integration instead of reporting it as tested.

## Recovery

Application rollback: redeploy the previously recorded Git revision and its matching configuration without deleting volumes or the standalone database. Database rollback requires a verified backup restore into a separate resource and an explicit cutover; do not roll migrations backward automatically. Stop a failed rollout and retain build/runtime logs without exposing secrets.

## Release boundaries

Billing and payment webhooks are disabled. Automatic space planning and room photo redesign do not have working model pipelines in the existing application; they must not be presented as completed generation. Space planning displays saved layouts, drawing-set settings now use the existing configuration API, and proposal delivery remains unavailable. Core design generation uses the existing Bedrock path; Python vision requires an OpenAI key.
