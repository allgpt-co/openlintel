#!/usr/bin/env bash
# Exercise production cache discovery beside conflicting shared-network aliases.
set -euo pipefail
cd "$(dirname "$0")/../.."
project="openlintel-discovery-${$}"
work="$(mktemp -d)"
chmod 700 "$work"
compose=(docker compose -p "$project" -f "$work/compose.json")
cleanup() {
  local code=$?
  if [ "$code" != 0 ]; then "${compose[@]}" ps -a || true; fi
  "${compose[@]}" down --volumes --remove-orphans || true
  rm -f "$work/source.json" "$work/compose.json"
  rmdir "$work"
  echo "SERVICE_DISCOVERY_EXIT=$code"
}
trap cleanup EXIT
docker compose -f docker-compose.production.yml config --no-interpolate --format json > "$work/source.json"
python3 - "$work" <<'PY'
import json, pathlib, sys
work = pathlib.Path(sys.argv[1])
source = json.loads((work / 'source.json').read_text())
services = {name: source['services'][name] for name in ['redis', 'meilisearch']}
services['meilisearch']['environment'] = {
    'MEILI_ENV': 'production',
    'MEILI_MASTER_KEY': 'disposable-ci-search-master-key-32-bytes',
}
services['decoy'] = {
    'image': 'redis:7-alpine',
    'command': ['redis-server', '--requirepass', 'disposable-decoy-password'],
    'networks': {'shared': {'aliases': ['redis', 'meilisearch']}},
}
services['probe'] = {
    'image': 'collab-test',
    'networks': ['default', 'shared'],
    'environment': {key: source['services']['web']['environment'][key]
                    for key in ['REDIS_URL', 'MEILI_URL']},
}
config = {'services': services, 'networks': {'default': {}, 'shared': {}},
          'volumes': {'redis_data': {}, 'meilisearch_data': {}}}
(work / 'compose.json').write_text(json.dumps(config))
PY
"${compose[@]}" up -d --wait --wait-timeout 180 redis meilisearch decoy
for phase in initial recreated; do
  if [ "$phase" = recreated ]; then
    "${compose[@]}" up -d --force-recreate --wait --wait-timeout 180 redis meilisearch
  fi
  # Coolify can also attach caches to its shared predefined network.
  for service in redis meilisearch; do
    docker network connect --alias "$service" "${project}_shared" "$("${compose[@]}" ps -q "$service")"
  done
  decoy_ip="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$("${compose[@]}" ps -q decoy)")"
  "${compose[@]}" run --rm -T --no-deps -e "DECOY_IP=$decoy_ip" probe node - <<'JS'
const assert = require('node:assert/strict');
const dns = require('node:dns/promises');
const { createClient } = require('redis');
(async () => {
  for (const key of ['REDIS_URL', 'MEILI_URL']) {
    const host = new URL(process.env[key]).hostname;
    for (let attempt = 0; attempt < 10; attempt++) {
      const addresses = await dns.resolve4(host);
      assert(addresses.length > 0, `${key} did not resolve`);
      assert(!addresses.includes(process.env.DECOY_IP), `${key} resolved outside the application`);
    }
  }
  const redis = createClient({ url: process.env.REDIS_URL, socket: { reconnectStrategy: false } });
  redis.on('error', () => {});
  await redis.connect();
  try {
    await redis.set('deployment-discovery-test', 'isolated');
    assert.equal(await redis.get('deployment-discovery-test'), 'isolated');
    await redis.del('deployment-discovery-test');
  } finally {
    await redis.quit();
  }
  const response = await fetch(`${process.env.MEILI_URL}/health`, { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).status, 'available');
  console.log('Cache DNS, Redis round trip, and search readiness passed beside conflicting aliases');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
JS
done
