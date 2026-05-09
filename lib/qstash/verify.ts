import { Receiver } from '@upstash/qstash';
import { NextRequest } from 'next/server';

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

export async function verifyQStashSignature(request: NextRequest): Promise<boolean> {
  // If we're not in production, and keys are missing, we might want to allow it?
  // But strict adherence implies we always validate.
  if (!process.env.QSTASH_CURRENT_SIGNING_KEY) {
    console.warn('QSTASH_CURRENT_SIGNING_KEY is not set. Signature validation will fail.');
  }

  try {
    const signature = request.headers.get('upstash-signature');
    if (!signature) {
      return false;
    }

    // Next.js request.text() reads the body, which can only be done once.
    // To allow the route handler to also read the body, we must clone the request.
    const clonedReq = request.clone();
    const body = await clonedReq.text();

    const isValid = await receiver.verify({
      signature,
      body,
    });

    return isValid;
  } catch (err) {
    console.error('[QStash] Signature verification failed:', err);
    return false;
  }
}
