import React from 'react';
import { UploadFlow } from '@/components/forms/UploadFlow';
import { MultiFileUploader } from '@/components/forms/MultiFileUploader';

export const metadata = {
  title: 'Upload Bills - Billdog',
};

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bebas text-navy mb-4 tracking-wide">
            Upload Your Municipal Bills
          </h1>
          <p className="text-slate-600 text-lg md:text-xl max-w-md mx-auto">
            Upload up to 36 months of bills for a comprehensive analysis.
            The more history, the stronger your dispute.
          </p>
        </div>

        <div className="w-full">
          <MultiFileUploader />
        </div>

        <div className="mt-8 w-full text-center">
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-light-grey" />
            <span className="text-grey text-sm uppercase tracking-wider font-bold">or single bill</span>
            <div className="flex-1 h-px bg-light-grey" />
          </div>
          <UploadFlow />
        </div>
      </div>
    </div>
  );
}
