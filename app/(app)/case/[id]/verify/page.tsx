'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export default function VerifyBillPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: caseId } = use(params);
  
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`/api/cases/${caseId}/verify`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify bill.');
      }

      if (data.resolved) {
        // AI found corrections! Payment is charging. Redirect to case detail to show success.
        router.push(`/case/${caseId}?verify_success=true`);
      } else {
        // AI didn't find corrections. Redirect with escalator warning.
        router.push(`/case/${caseId}?verify_failed=true`);
      }
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <h1 className="font-display text-4xl text-navy mb-4">Did they fix it?</h1>
      <p className="text-grey mb-8 font-body text-lg leading-relaxed">
        Upload your latest municipal statement (Bill 2). Our AI will instantly compare it against your original disputed bill to check if the municipality applied the corrections you requested.
      </p>

      <div className="bg-white border border-light-grey rounded-2xl p-8 shadow-sm">
        <label className="block mb-4 font-bold text-navy uppercase tracking-wide text-sm">
          Upload New Statement (PDF only)
        </label>
        
        <input 
          type="file" 
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-grey
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-bold
            file:bg-orange/10 file:text-orange
            hover:file:bg-orange/20 cursor-pointer mb-6"
        />

        {error && (
          <div className="bg-error/10 text-error px-4 py-3 rounded-md mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        <Button 
          onClick={handleUpload} 
          disabled={!file || isUploading}
          className="w-full h-12"
        >
          {isUploading ? 'Analysing Bill...' : 'Upload & Verify Resolution'}
        </Button>
      </div>
      
      <p className="mt-6 text-sm text-grey text-center">
        This analysis takes about 60 seconds. Please do not close the page after clicking upload.
      </p>
    </div>
  );
}
