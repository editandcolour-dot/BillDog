const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const envStr = fs.readFileSync(envPath, 'utf8');
for (const line of envStr.split('\n')) {
  const match = line.match(/^([^#\s][^=]*)=(.*)$/);
  if (match) {
    let key = match[1].trim();
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    else if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    process.env[key] = val;
  }
}
process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

spawnSync('npx.cmd', ['tsx', 'scripts/corpus-test-runner.ts'], { stdio: 'inherit', env: process.env, shell: true });
