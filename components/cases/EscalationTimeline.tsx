import { getMunicipalityContacts, getPublicProtectorContacts } from '@/lib/escalation/contactLookup';

export function EscalationTimeline({ caseRecord, priorLetters, wardCouncillor }: { caseRecord: any, priorLetters: any[], wardCouncillor: any | null }) {
  const currentStep = caseRecord.escalation_step || 0;
  const contacts = getMunicipalityContacts(caseRecord.municipality);

  const getStepData = (stepNumber: number) => {
    return priorLetters.find(pl => pl.step === stepNumber);
  };

  const renderStatus = (step: number) => {
    if (step <= currentStep) return '✅';
    if (step === currentStep + 1 && caseRecord.escalation_blocked) return '🛑';
    if (step === currentStep + 1) return '⏳';
    return '⬜';
  };

  const calculateNextActionDate = (step: number) => {
    if (!caseRecord.last_escalation_at) return 'Pending analysis / Initial Send';
    const lastDate = new Date(caseRecord.last_escalation_at);
    if (step === 2) {
      lastDate.setDate(lastDate.getDate() + 30);
    } else if (step === 3) {
      lastDate.setDate(lastDate.getDate() + 21);
    }
    return lastDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6 font-body text-sm">
      {caseRecord.escalation_blocked && (
        <div className="p-4 bg-orange/10 border border-orange/40 rounded-xl text-orange mb-6">
          <p className="font-bold uppercase tracking-wide text-xs mb-1">Escalation Blocked</p>
          <p>{caseRecord.escalation_block_reason}</p>
        </div>
      )}

      {/* Step 1 */}
      <div className={`p-5 rounded-xl border ${currentStep >= 1 ? 'bg-success/5 border-success/20' : 'bg-off-white border-light-grey'}`}>
        <h4 className="font-bold text-navy text-base mb-2 flex items-center gap-2">
          {renderStatus(1)} Step 1 — Initial dispute sent to {contacts?.name} billing dept
        </h4>
        {currentStep >= 1 ? (
          <p className="text-gray-600 pl-6 border-l-2 border-success/30 ml-3">
            Sent: {new Date(getStepData(1)?.sent_at || Date.now()).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} | Reference: BD-STEP1-{caseRecord.id.substring(0,8).toUpperCase()}
          </p>
        ) : (
          <p className="text-gray-500 pl-6 border-l-2 border-gray-200 ml-3">
            Will trigger automatically once errors are proven.
          </p>
        )}
      </div>

      {/* Step 2 */}
      <div className={`p-5 rounded-xl border ${currentStep >= 2 ? 'bg-success/5 border-success/20' : 'bg-off-white border-light-grey'}`}>
        <h4 className="font-bold text-navy text-base mb-2 flex items-center gap-2">
          {renderStatus(2)} Step 2 — Escalation to {contacts?.ombudsmanType === 'INDEPENDENT' ? 'Independent Ombudsman' : 'Municipal Manager'}
        </h4>
        {currentStep >= 2 ? (
          <p className="text-gray-600 pl-6 border-l-2 border-success/30 ml-3">
            Sent: {new Date(getStepData(2)?.sent_at || Date.now()).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} | Reference: BD-STEP2-{caseRecord.id.substring(0,8).toUpperCase()}
          </p>
        ) : (
          <div className="text-gray-500 pl-6 border-l-2 border-gray-200 ml-3">
            {currentStep === 1 ? (
              <>
                 <p>Sends automatically: {calculateNextActionDate(2)} (if no response)</p>
                 {wardCouncillor && <p className="mt-1">Will CC: Your ward councillor ({wardCouncillor.name})</p>}
                 {contacts?.code === 'CoJ' && (
                   <p className="mt-2 text-xs">
                     Alternative: <a href="https://ombudsmancomplaints.azurewebsites.net/" target="_blank" rel="noreferrer" className="text-blue hover:underline">Submit directly to CoJ Ombudsman</a>
                   </p>
                 )}
              </>
            ) : (
               <p>Pending completion of prior steps.</p>
            )}
          </div>
        )}
      </div>

      {/* Step 3 */}
      <div className={`p-5 rounded-xl border ${currentStep >= 3 ? 'bg-success/5 border-success/20' : 'bg-off-white border-light-grey'}`}>
        <h4 className="font-bold text-navy text-base mb-2 flex items-center gap-2">
          {renderStatus(3)} Step 3 — Public Protector ({contacts?.publicProtectorProvince?.replace('_',' ') || 'Head Office'})
        </h4>
        {currentStep >= 3 ? (
          <p className="text-gray-600 pl-6 border-l-2 border-success/30 ml-3">
            Sent: {new Date(getStepData(3)?.sent_at || Date.now()).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })} | Reference: BD-STEP3-{caseRecord.id.substring(0,8).toUpperCase()}
          </p>
        ) : (
          <div className="text-gray-500 pl-6 border-l-2 border-gray-200 ml-3">
            {currentStep === 2 ? (
               <>
                 <p>Sends automatically: {calculateNextActionDate(3)} (if no response)</p>
                 <p className="mt-1">
                   Alternative: <a href="https://cma.pprotect.org/Complaint-Form.aspx" target="_blank" rel="noreferrer" className="text-blue hover:underline">Submit directly via Public Protector Portal</a>
                 </p>
               </>
            ) : (
               <p>Pending completion of prior steps.</p>
            )}
          </div>
        )}
      </div>

      {/* Step 4 */}
      <div className={`p-5 rounded-xl border ${currentStep >= 4 ? 'bg-success/5 border-success/20' : 'bg-off-white border-light-grey'}`}>
        <h4 className="font-bold text-navy text-base mb-2 flex items-center gap-2">
          {renderStatus(4)} Step 4 — Presidential Hotline (manual)
        </h4>
        {currentStep >= 4 ? (
          <p className="text-gray-600 pl-6 border-l-2 border-success/30 ml-3">
            Resolved / Triggered Manually By User.
          </p>
        ) : (
          <p className="text-gray-500 pl-6 border-l-2 border-gray-200 ml-3">
            {currentStep === 3 ? 'Available for manual trigger from dashboard' : 'Pending completion of prior steps.'}
          </p>
        )}
      </div>
    </div>
  );
}
