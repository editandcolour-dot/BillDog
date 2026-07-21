/**
 * check:models — deploy gate for dead Claude models.
 *
 * Runs the model guard against Anthropic's live /v1/models list and exits:
 *   0 → all model constants resolve to live models
 *   1 → at least one constant points at a retired/dead model
 *   2 → could not reach /v1/models (cannot verify)
 *
 * Usage: npm run check:models
 */
import fs from 'fs';
import path from 'path';
import { runModelGuard } from '../lib/claude/model-guard';

// Load ANTHROPIC_API_KEY from .env.local (no dotenv dependency in this repo).
function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();
  const r = await runModelGuard();

  console.log('── check:models ──────────────────────────────');
  for (const c of r.checked) {
    console.log(`${c.alive ? 'ALIVE' : 'DEAD '}  ${c.constant} = ${c.model}`);
  }
  if (r.liveModelIds.length > 0) {
    console.log(`(${r.liveModelIds.length} models live on /v1/models)`);
  }

  // Use process.exitCode (not process.exit) so the event loop drains cleanly.
  // Forcing process.exit() under tsx on Windows trips a libuv teardown assertion
  // and reports a false non-zero — fatal for a deploy gate.
  if (r.fetchError) {
    console.error(`Could not verify models: ${r.fetchError}`);
    process.exitCode = 2;
    return;
  }
  if (!r.ok) {
    console.error(`DEAD models detected: ${r.deadModels.map((d) => `${d.constant}=${d.model}`).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.log('All model constants are alive.');
  process.exitCode = 0;
}

main();
