import { runSocialMonitor } from '../lib/social-monitor';

async function run() {
    console.log('=== Starting Billdog Social Monitor (CLI) ===');
    await runSocialMonitor();
    console.log('=== Completed ===');
}

run().catch(console.error);
