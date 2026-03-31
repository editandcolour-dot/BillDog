'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';
import { Camera, ImagePlus, Loader2, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import type { VisionAnalysisResult } from '@/lib/claude/analyse-vision';

export function CameraCapture() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [images, setImages] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'compressing' | 'extracting' | 'review' | 'submitting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{ analysis: VisionAnalysisResult; tempPaths: string[] } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > 2) {
      setError('You can only upload a maximum of 2 images.');
      return;
    }

    setImages(prev => [...prev, ...files].slice(0, 2));
    
    // Clear input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setError(null);
  };

  const handleExtract = async () => {
    if (images.length === 0) return;
    setStatus('compressing');
    setError(null);

    try {
      // 1. Compress Images
      const compressedFiles = await Promise.all(
        images.map(img => 
          imageCompression(img, {
            maxSizeMB: 2,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
          })
        )
      );

      // 2. Upload to Temp & Extract Data
      setStatus('extracting');
      
      const formData = new FormData();
      compressedFiles.forEach(file => {
        formData.append('images', file, file.name || 'image.jpg');
      });

      const res = await fetch('/api/extract-vision', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract data');
      }

      setPreviewData({
        analysis: data.analysis,
        tempPaths: data.tempPaths,
      });
      setStatus('review');

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred during extraction.');
      setStatus('idle');
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    setStatus('submitting');
    setError(null);

    try {
      const res = await fetch('/api/cases/create-from-vision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysis: previewData.analysis,
          tempPaths: previewData.tempPaths,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create case');
      }

      // Redirect directly to the analysis result since analysis is already done!
      router.push(`/analysis/${data.caseId}`);

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An error occurred committing the case.');
      setStatus('review');
    }
  };

  const handleRetake = () => {
    setImages([]);
    setPreviewData(null);
    setStatus('idle');
  };

  if (status === 'review' && previewData) {
    const { account_number, total_billed, bill_period } = previewData.analysis;
    const isTotalConfident = (previewData.analysis.total_confidence || 1) >= 0.8;
    const isAccountConfident = (previewData.analysis.account_confidence || 1) >= 0.8;
    
    const needsRetake = !isTotalConfident || !isAccountConfident;

    return (
      <div className="bg-white border border-light-grey rounded-3xl p-8 shadow-sm text-center">
        <h2 className="font-display text-2xl text-navy uppercase tracking-wide mb-6">Extraction Preview</h2>
        
        {needsRetake && (
          <div className="mb-6 p-4 bg-orange/10 border border-orange/20 rounded-xl text-left flex items-start gap-4">
            <ShieldAlert className="w-6 h-6 text-orange shrink-0 mt-1" />
            <div>
              <p className="font-bold text-navy uppercase tracking-wide text-sm mb-1">Low Confidence Warning</p>
              <p className="text-sm font-body text-grey">
                We could not clearly read some details. Make sure the bill is well-lit and not blurry. Please retake the photo.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 text-left bg-off-white p-6 rounded-2xl border border-light-grey mb-8 font-body">
          <div className="flex justify-between items-center pb-4 border-b border-light-grey">
            <span className="text-grey font-bold uppercase tracking-wide text-xs">Account Number</span>
            <span className={`font-medium ${!isAccountConfident ? 'text-orange' : 'text-navy'}`}>
              {account_number || 'Could not detect'}
            </span>
          </div>
          <div className="flex justify-between items-center pb-4 border-b border-light-grey">
            <span className="text-grey font-bold uppercase tracking-wide text-xs">Total Billed</span>
            <span className={`font-medium ${!isTotalConfident ? 'text-orange' : 'text-navy'}`}>
              {total_billed ? `R${total_billed.toFixed(2)}` : 'Could not detect'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-grey font-bold uppercase tracking-wide text-xs">Billing Period</span>
            <span className="text-navy font-medium">{bill_period || 'Unknown'}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleRetake}
            className="px-6 py-3 border border-light-grey text-navy rounded-md font-bold uppercase tracking-wide text-sm hover:bg-off-white transition-colors"
          >
            Wrong, let me retake
          </button>
          {!needsRetake && (
            <button
              onClick={handleConfirm}
              className="px-6 py-3 bg-navy text-white rounded-md font-bold uppercase tracking-wide text-sm hover:bg-blue transition-colors flex items-center justify-center"
            >
              Looks good
            </button>
          )}
        </div>
      </div>
    );
  }

  if (status === 'compressing' || status === 'extracting' || status === 'submitting') {
    return (
      <div className="bg-white border border-light-grey rounded-3xl p-12 shadow-sm text-center flex flex-col items-center">
        <Loader2 className="w-12 h-12 text-blue animate-spin mb-6" />
        <h2 className="font-display text-2xl text-navy uppercase tracking-wide mb-2">
          {status === 'compressing' && 'Optimising Images...'}
          {status === 'extracting' && 'Extracting Data...'}
          {status === 'submitting' && 'Creating Case...'}
        </h2>
        <p className="text-grey font-body text-sm">
          {status === 'extracting' ? 'This takes about 15-30 seconds.' : 'Please wait.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-light-grey rounded-3xl p-8 py-10 shadow-sm">
      <div className="mb-8 p-5 bg-blue/5 border border-blue/10 rounded-2xl flex items-start gap-4">
        <Camera className="w-6 h-6 text-blue shrink-0 mt-1" />
        <div>
          <p className="font-bold text-navy uppercase tracking-wide text-sm mb-1">Camera Guidelines</p>
          <p className="text-sm font-body text-grey leading-relaxed">
            Lay the bill flat on a table. Ensure good lighting and that all four corners are visible. Avoid casting shadows across any numbers.
          </p>
        </div>
      </div>

      <input
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {images.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {images.map((img, i) => (
              <div key={i} className="relative aspect-[3/4] bg-off-white rounded-xl border border-light-grey overflow-hidden group">
                {/* Normally we'd render an object URL or canvas, but a file name + icon is lighter and avoids memory leaks if not cleaned up */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-success mb-2" />
                  <span className="text-xs font-bold text-navy truncate w-full px-2">{img.name}</span>
                </div>
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md text-grey hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {images.length < 2 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="aspect-[3/4] rounded-xl border-2 border-dashed border-light-grey hover:border-blue hover:bg-off-white transition-colors flex flex-col items-center justify-center gap-3 text-grey group"
              >
                <ImagePlus className="w-8 h-8 group-hover:text-blue transition-colors" />
                <span className="text-xs font-bold uppercase tracking-wide">Add Page 2</span>
              </button>
            )}
          </div>

          <button
            onClick={handleExtract}
            className="w-full py-4 bg-orange text-white rounded-md font-bold uppercase tracking-wide text-sm hover:bg-[#e65c00] transition-colors shadow-lg shadow-orange/20"
          >
            Extract Data
          </button>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-12 border-2 border-dashed border-light-grey hover:border-blue hover:bg-off-white rounded-2xl flex flex-col items-center justify-center gap-4 group transition-colors"
        >
          <div className="w-16 h-16 rounded-full bg-blue/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Camera className="w-8 h-8 text-blue" />
          </div>
          <span className="font-display text-xl text-navy uppercase tracking-wide">Take Photo or Select Image</span>
        </button>
      )}
    </div>
  );
}
