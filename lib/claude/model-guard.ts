/**
 * Dead-model guard.
 *
 * Source of truth = Anthropic's own model list (GET /v1/models). We compare
 * every model constant in use against that live list and warn LOUDLY if any
 * constant points at a model the API no longer serves.
 *
 * - check:models script (deploy gate): exits non-zero if any model is dead.
 * - Runtime (first Claude call): runs once, caches, console.error on dead —
 *   but NEVER throws and never takes the product down.
 *
 * Alias tolerance: a constant like `claude-opus-4-8` is considered alive if the
 * live list contains it OR any dated snapshot that it prefixes
 * (e.g. `claude-opus-4-8-20250115`), since the Messages API resolves aliases.
 */
import { CLAUDE_MODEL } from './model';
import { VERICITE_MODEL } from '@/lib/tariff/vericite/model';

export interface ModelGuardResult {
  checked: { constant: string; model: string; alive: boolean }[];
  deadModels: { constant: string; model: string }[];
  liveModelIds: string[];
  ok: boolean; // true when every constant resolves to a live model
  fetchError?: string;
}

/** The constants this guard is responsible for. */
function constantsInUse(): { constant: string; model: string }[] {
  return [
    { constant: 'CLAUDE_MODEL', model: CLAUDE_MODEL },
    { constant: 'VERICITE_MODEL', model: VERICITE_MODEL },
  ];
}

/** Fetch every model id Anthropic currently serves (handles pagination). */
async function fetchLiveModelIds(): Promise<string[]> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set');

  const ids: string[] = [];
  let afterId: string | null = null;

  // Defensive pagination loop (the list is small; usually one page).
  for (let page = 0; page < 20; page++) {
    const url = new URL('https://api.anthropic.com/v1/models');
    url.searchParams.set('limit', '1000');
    if (afterId) url.searchParams.set('after_id', afterId);

    const resp = await fetch(url.toString(), {
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    });
    if (!resp.ok) throw new Error(`/v1/models HTTP ${resp.status}`);

    const json: any = await resp.json();
    for (const m of json.data || []) if (m?.id) ids.push(m.id);

    if (json.has_more && json.last_id) {
      afterId = json.last_id;
    } else {
      break;
    }
  }
  return ids;
}

function isAlive(model: string, liveIds: string[]): boolean {
  return liveIds.includes(model) || liveIds.some((id) => id.startsWith(`${model}-`));
}

/**
 * Run the guard: fetch the live list, compare constants, console.error any dead.
 * On fetch failure, warns but returns ok:true (no live data → cannot condemn).
 */
export async function runModelGuard(): Promise<ModelGuardResult> {
  const constants = constantsInUse();
  try {
    const liveModelIds = await fetchLiveModelIds();
    const checked = constants.map((c) => ({ ...c, alive: isAlive(c.model, liveModelIds) }));
    const deadModels = checked
      .filter((c) => !c.alive)
      .map(({ constant, model }) => ({ constant, model }));

    for (const d of deadModels) {
      console.error(
        `[MODEL-GUARD] DEAD MODEL: ${d.constant} = "${d.model}" is NOT in Anthropic's live /v1/models list. ` +
          `Update the constant in lib/claude/model.ts or lib/tariff/vericite/model.ts.`,
      );
    }
    return { checked, deadModels, liveModelIds, ok: deadModels.length === 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[MODEL-GUARD] Could not verify models against /v1/models: ${msg}`);
    return { checked: [], deadModels: [], liveModelIds: [], ok: true, fetchError: msg };
  }
}

// ── Runtime one-shot wiring ──────────────────────────────────────────────────

let _guardStarted = false;

/**
 * Fire the guard at most once per process, fire-and-forget. Never awaited by
 * callers, never throws — it only logs. Skipped under test runners to avoid
 * network calls in unit tests.
 */
export function maybeRunModelGuardOnce(): void {
  if (_guardStarted) return;
  if (process.env.VITEST || process.env.NODE_ENV === 'test') return;
  _guardStarted = true;
  // Detach: a slow/failed /v1/models call must not delay or break the Claude call.
  void runModelGuard().catch(() => {});
}
