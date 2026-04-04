import { NextResponse } from 'next/server';
import { runSocialMonitor } from '@/lib/social-monitor';

export async function POST(req: Request) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' }, 
      { status: 401 }
    );
  }
  
  await runSocialMonitor();
  
  return NextResponse.json({ success: true });
}
