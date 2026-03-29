'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDropZone } from '@/components/ui/FileDropZone';
import { Button } from '@/components/ui/Button';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
];

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    
    if (!ALLOWED_MIME_TYPES.includes(selectedFile.type) && 
        !selectedFile.name.toLowerCase().endsWith('.heic')) {
      setError('We only accept PDF, JPG, PNG, or HEIC files. Please try again.');
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('Your file is too large. Please upload a file under 10MB.');
      setFile(null);
      return;
    }

    if (selectedFile.size === 0) {
      setError('The file appears to be empty. Please try a different file.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a bill to upload.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.status === 401) {
        throw new Error('AUTH_ERROR');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'UPLOAD_FAILED');
      }

      const data = await response.json();
      
      if (data.caseId) {
        router.push(`/analysis/${data.caseId}`);
      } else {
        throw new Error('UPLOAD_FAILED');
      }
    } catch (err: unknown) {
      console.error('[UploadForm]', err);
      const e = err as Error;
      
      if (e.message === 'AUTH_ERROR') {
        setError('Your session has expired. Please log in again.');
      } else {
        setError('Upload failed. Please check your connection and try again.');
      }
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleUpload} className="w-full max-w-lg mx-auto flex flex-col items-center">
      <FileDropZone 
        onFileSelect={handleFileSelect} 
        isLoading={isUploading} 
        error={error} 
        selectedFile={file} 
      />
      
      <p className="text-slate-500 text-sm mt-6 text-center max-w-sm leading-relaxed">
        🔒 Your bill is encrypted and stored securely. We never share your data.
      </p>

      <Button 
        type="submit" 
        variant="primary" 
        className="w-full mt-8 h-12 text-lg font-medium" 
        disabled={isUploading || !file}
      >
        {isUploading ? 'Uploading...' : 'Analyse My Bill'}
      </Button>
    </form>
  );
}
