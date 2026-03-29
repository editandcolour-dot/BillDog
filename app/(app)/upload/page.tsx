import React from 'react';
import { UploadForm } from '@/components/forms/UploadForm';

export const metadata = {
  title: 'Upload Bill - Billdog',
};

export default function UploadPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFF] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-bebas text-navy mb-4 tracking-wide">Upload Your Municipal Bill</h1>
          <p className="text-slate-600 text-lg md:text-xl max-w-md mx-auto">
            PDF or photo accepted. We&apos;ll analyse it and find any errors.
          </p>
        </div>
        
        <div className="w-full">
          <UploadForm />
        </div>
      </div>
    </div>
  );
}
