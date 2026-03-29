'use client';

import React, { useCallback, useState, useRef } from 'react';

interface FileDropZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  isLoading?: boolean;
  error?: string | null;
  selectedFile?: File | null;
}

export function FileDropZone({
  onFileSelect,
  accept = 'application/pdf,image/jpeg,image/png,image/heic',
  isLoading = false,
  error = null,
  selectedFile = null,
}: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isLoading) setIsDragOver(true);
  }, [isLoading]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (isLoading) return;
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [isLoading, onFileSelect]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Determine visual state classes
  let borderClass = 'border-slate-300 border-dashed';
  let bgClass = 'bg-white';
  
  if (error) {
    borderClass = 'border-red-500 border-solid';
    bgClass = 'bg-red-50';
  } else if (isDragOver) {
    borderClass = 'border-orange border-solid';
    bgClass = 'bg-orange/5';
  } else if (selectedFile) {
    borderClass = 'border-green-500 border-solid';
    bgClass = 'bg-green-50';
  }

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={isLoading ? -1 : 0}
        aria-label="File upload dropzone. Click or press Enter to select a file."
        className={`relative w-full min-h-[160px] p-6 rounded-xl shadow-sm transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-orange focus-visible:ring-offset-2 focus-visible:ring-offset-background ${borderClass} border-2 ${bgClass} ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        onKeyDown={handleKeyDown}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={accept}
          // capture="environment" is great for mobile browsers resolving this to the camera
          capture="environment"
          onChange={handleFileInput}
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-orange" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-navy font-medium mt-2">Uploading your bill...</p>
            <div className="w-48 h-2 bg-slate-200 rounded-full overflow-hidden mt-3 shadow-inner">
              <div className="h-full bg-orange w-1/2 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full"></div>
            </div>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <svg className="w-10 h-10 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-navy font-medium break-all px-4">{selectedFile.name}</p>
            <p className="text-slate-500 text-sm">{formatSize(selectedFile.size)}</p>
            <p className="text-orange text-sm mt-2 font-medium">Click to select a different file</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <svg className="w-12 h-12 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <p className="text-xl font-medium text-navy">Upload Your Municipal Bill</p>
            <p className="text-slate-500 mt-1">Drag and drop here, or click to browse</p>
            <p className="text-slate-400 text-xs mt-2 font-medium tracking-wide">PDF, JPG, PNG or HEIC (Max 10MB)</p>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-3 text-red-500 text-sm font-medium" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
