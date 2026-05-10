'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { CaptureIdModal } from './CaptureIdModal';

interface Props {
  caseId: string;
  mandateRevoked: boolean;
  idCaptured: boolean;
}

/**
 * Surfaced when can_submit_dispute would fail. Two distinct banners:
 *  - Mandate revoked  → link to settings
 *  - ID not captured  → opens CaptureIdModal
 * If both fail, mandate banner takes priority (settings is a hard pre-req).
 */
export function DisputeGateBanner({ caseId, mandateRevoked, idCaptured }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  if (mandateRevoked) {
    return (
      <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
        <p className="font-bold text-navy">Mandate revoked</p>
        <p className="text-sm text-slate-600 mt-1 mb-3">
          Re-grant your mandate in settings to continue this dispute.
        </p>
        <Link href="/account" className="inline-block">
          <Button variant="primary">Go to Settings</Button>
        </Link>
      </div>
    );
  }

  if (!idCaptured) {
    return (
      <>
        <div className="mb-6 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <p className="font-bold text-navy">Almost there — ID required</p>
          <p className="text-sm text-slate-600 mt-1 mb-3">
            Your municipality requires your SA ID number to verify you as the
            account holder before they will review the dispute.
          </p>
          <Button variant="primary" onClick={() => setShowModal(true)}>
            Provide ID
          </Button>
        </div>
        {showModal && (
          <CaptureIdModal
            caseId={caseId}
            onSuccess={() => {
              setShowModal(false);
              router.refresh();
            }}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    );
  }

  return null;
}
