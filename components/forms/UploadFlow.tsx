'use client';

import React, { useState } from 'react';
import { UploadForm } from './UploadForm';
import { CameraCapture } from './CameraCapture';
import { FileText, Camera } from 'lucide-react';

export function UploadFlow() {
  const [mode, setMode] = useState<'selection' | 'pdf' | 'camera'>('selection');

  if (mode === 'pdf') {
    return (
      <div className="w-full">
        <button 
          onClick={() => setMode('selection')}
          className="text-grey hover:text-navy text-sm font-bold uppercase tracking-wide mb-6 inline-flex items-center transition-colors"
        >
          &larr; Back to options
        </button>
        <UploadForm />
      </div>
    );
  }

  if (mode === 'camera') {
    return (
      <div className="w-full">
        <button 
          onClick={() => setMode('selection')}
          className="text-grey hover:text-navy text-sm font-bold uppercase tracking-wide mb-6 inline-flex items-center transition-colors"
        >
          &larr; Back to options
        </button>
        <CameraCapture />
      </div>
    );
  }

  return (
    <div className="bg-white border border-light-grey rounded-3xl p-8 md:p-12 shadow-sm text-center">
      <h2 className="font-display text-2xl md:text-3xl text-navy uppercase tracking-wide mb-8">
        How would you like to provide your bill?
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => setMode('pdf')}
          className="group relative bg-off-white border-2 border-light-grey rounded-2xl p-8 hover:border-blue hover:bg-blue/5 transition-all text-center flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <FileText className="w-8 h-8 text-blue" />
          </div>
          <div>
            <span className="block font-display text-xl text-navy uppercase tracking-wide mb-2">Upload PDF</span>
            <span className="text-grey text-sm font-body">I have a digital PDF file statement downloaded from my municipality.</span>
          </div>
        </button>

        <button
          onClick={() => setMode('camera')}
          className="group relative bg-off-white border-2 border-light-grey rounded-2xl p-8 hover:border-orange hover:bg-orange/5 transition-all text-center flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <Camera className="w-8 h-8 text-orange" />
          </div>
          <div>
            <span className="block font-display text-xl text-navy uppercase tracking-wide mb-2">Photograph Bill</span>
            <span className="text-grey text-sm font-body">I have a printed physical bill. Take a clear photo of the pages.</span>
          </div>
        </button>
      </div>
    </div>
  );
}
