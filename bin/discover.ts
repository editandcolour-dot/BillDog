import { DiscoveryAgent } from '../lib/discovery/agent';
import * as fs from 'fs';
import * as path from 'path';

const lines = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split('\n');
const env: Record<string, string> = {};
lines.forEach(l => {
  const parts = l.split('=');
  if (parts.length > 1) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
  }
});
// Also inject into process.env so anthropic sdk can use ANTHROPIC_API_KEY
Object.assign(process.env, env);

async function main() {
  const args = process.argv.slice(2);
  const municipalityId = args[0] || 'city-of-cape-town';
  const startUrl = args[1] || 'https://eservices.capetown.gov.za/irj/portal';

  console.log(`[CLI] Starting Model B Discovery for ${municipalityId}`);
  console.log(`[CLI] Start URL: ${startUrl}`);
  
  const startTime = Date.now();
  const agent = new DiscoveryAgent(municipalityId, {
    username: env.TEST_COCT_USERNAME,
    password: env.TEST_COCT_PASSWORD
  });

  try {
    const { cost, loops } = await agent.start(startUrl);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n========================================`);
    console.log(`DISCOVERY COMPLETE`);
    console.log(`Municipality: ${municipalityId}`);
    console.log(`Time elapsed: ${elapsed}s`);
    console.log(`Loops: ${loops}`);
    console.log(`Total Token Cost: $${cost.toFixed(4)}`);
    console.log(`========================================\n`);
  } catch (e: any) {
    console.error(`[CLI] Discovery failed:`, e.message);
  }
}

main();
