'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, X, FileText, AlertCircle, CheckCircle2, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_BILLS = 36;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'];

interface QueuedFile {
  id: string;
  file: File;
  status: 'queued' | 'uploading' | 'done' | 'failed';
  error?: string;
}

export function MultiFileUploader() {
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    setGlobalError(null);
    const incoming = Array.from(newFiles);

    if (files.length + incoming.length > MAX_BILLS) {
      setGlobalError(`Maximum ${MAX_BILLS} bills allowed. You have ${files.length}, tried adding ${incoming.length}.`);
      return;
    }

    const validated: QueuedFile[] = [];
    const errors: string[] = [];

    for (const file of incoming) {
      const ext = file.name.toLowerCase().split('.').pop() || '';
      const validExts = ['pdf', 'jpg', 'jpeg', 'png', 'heic'];
      
      const isAllowedType = ALLOWED_TYPES.includes(file.type) || validExts.includes(ext);

      if (!isAllowedType) {
        errors.push(`"${file.name}" is unsupported.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`"${file.name}" exceeds 10MB.`);
        continue;
      }
      if (file.size === 0) {
        errors.push(`"${file.name}" is empty.`);
        continue;
      }
      validated.push({
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        file,
        status: 'queued',
      });
    }

    if (errors.length > 0) {
      setGlobalError(errors.join(' '));
    }

    if (validated.length > 0) {
      setFiles(prev => {
        const newFiles = [...prev, ...validated];
        return newFiles.slice(0, MAX_BILLS); // Hard cap just in case
      });
    }
  }, [files.length]);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleUploadAll = async () => {
    if (files.length === 0) return;
    setIsUploading(true);
    setGlobalError(null);

    // Mark all pending as uploading
    setFiles(prev => prev.map(f => f.status === 'queued' ? { ...f, status: 'uploading' as const } : f));

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setGlobalError('Session expired. Please log in again.');
        setFiles(prev => prev.map(f => f.status === 'uploading' ? { ...f, status: 'failed' as const } : f));
        setIsUploading(false);
        return;
      }

      const activeCaseId = caseId || uuidv4();
      const uploadedFiles: Array<{ id: string; original_filename: string; file_size_bytes: number; mime_type: string; bill_url: string }> = [];
      let failureCount = 0;

      // 1. Upload files directly to Supabase Storage
      for (const f of files) {
        if (f.status === 'done') continue; // skip already uploaded if adding more

        const billId = uuidv4();
        const sanitizedName = f.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${user.id}/${activeCaseId}/${billId}_${sanitizedName}`;

        const { error: uploadError } = await supabase.storage
          .from('bills')
          .upload(storagePath, f.file, {
            contentType: f.file.type || 'application/octet-stream',
            upsert: false,
          });

        if (uploadError) {
          console.error(`[MultiFileUploader] Storage error for ${f.file.name}:`, uploadError);
          failureCount++;
          setFiles(prev => prev.map(fileItem => 
            fileItem.id === f.id ? { ...fileItem, status: 'failed' as const, error: 'Storage upload failed' } : fileItem
          ));
        } else {
          uploadedFiles.push({
            id: billId,
            original_filename: f.file.name,
            file_size_bytes: f.file.size,
            mime_type: f.file.type || 'application/octet-stream',
            bill_url: storagePath
          });
          setFiles(prev => prev.map(fileItem => 
            fileItem.id === f.id ? { ...fileItem, status: 'done' as const } : fileItem
          ));
        }
      }

      if (uploadedFiles.length === 0) {
        setGlobalError('All file uploads failed. Check your connection.');
        setIsUploading(false);
        return;
      }

      // 2. Transmit metadata to the API Route
      const res = await fetch('/api/upload-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: activeCaseId,
          existingCaseId: caseId,
          files: uploadedFiles
        }),
      });

      if (res.status === 401) {
        setGlobalError('Session expired. Please log in again.');
        setIsUploading(false);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setGlobalError(data.error || 'Database registration failed');
        setFiles(prev => prev.map(f => f.status === 'uploading' ? { ...f, status: 'failed' as const } : f));
        setIsUploading(false);
        return;
      }

      setCaseId(data.caseId);
      setUploadComplete(true);

      if (failureCount > 0 || (data.failures && data.failures.length > 0)) {
        const totalFailures = failureCount + (data.failures?.length || 0);
        setGlobalError(`${totalFailures} file(s) failed. You can add more and try again.`);
      }
    } catch (err) {
      console.error('[MultiFileUploader]', err);
      setGlobalError('Upload failed. Check your connection and try again.');
      setFiles(prev => prev.map(f => f.status === 'uploading' ? { ...f, status: 'failed' as const } : f));
    }

    setIsUploading(false);
  };

  const handleAnalyse = () => {
    if (caseId) {
      router.push(`/analysis/${caseId}`);
    }
  };

  const doneCount = files.filter(f => f.status === 'done').length;
  const queuedCount = files.filter(f => f.status === 'queued').length;

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-light-grey rounded-2xl p-8 md:p-12 text-center 
                   cursor-pointer transition-all hover:border-blue hover:bg-blue/5
                   focus-within:border-blue focus-within:bg-blue/5"
        role="button"
        tabIndex={0}
        aria-label="Drop files or click to browse"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-off-white flex items-center justify-center">
            <Upload className="w-8 h-8 text-blue" />
          </div>
          <div>
            <p className="font-display text-xl text-navy uppercase tracking-wide mb-2">
              Drop your bills here
            </p>
            <p className="text-grey text-sm">
              PDF or photos • Up to {MAX_BILLS} bills • 10MB each
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.heic"
          className="hidden"
          onChange={e => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-navy uppercase tracking-wide">
              {files.length} bill{files.length !== 1 ? 's' : ''} selected
              {doneCount > 0 && ` • ${doneCount} uploaded`}
            </p>
            <span className="text-xs text-grey">
              {files.length}/{MAX_BILLS} max
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
            {files.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 bg-white border border-light-grey rounded-lg px-4 py-2.5 text-sm"
              >
                <FileText className="w-4 h-4 text-grey flex-shrink-0" />
                <span className="flex-1 truncate text-navy">{f.file.name}</span>
                <span className="text-xs text-grey flex-shrink-0">
                  {(f.file.size / 1024 / 1024).toFixed(1)}MB
                </span>

                {f.status === 'queued' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                    className="text-grey hover:text-error transition-colors p-1"
                    aria-label={`Remove ${f.file.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {f.status === 'uploading' && (
                  <Loader2 className="w-4 h-4 text-blue animate-spin flex-shrink-0" />
                )}
                {f.status === 'done' && (
                  <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                )}
                {f.status === 'failed' && (
                  <AlertCircle className="w-4 h-4 text-error flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Add more button */}
          {!uploadComplete && files.length < MAX_BILLS && (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 text-sm text-blue hover:text-navy transition-colors mt-2"
            >
              <Plus className="w-4 h-4" /> Add more bills
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {globalError && (
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-error/20 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
          <p className="text-sm text-error">{globalError}</p>
        </div>
      )}

      {/* Security note */}
      <p className="text-slate-500 text-sm mt-6 text-center max-w-sm mx-auto leading-relaxed">
        🔒 Your bills are encrypted and stored securely. We never share your data.
      </p>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 mt-6">
        {!uploadComplete && (
          <Button
            type="button"
            variant="primary"
            className="w-full h-12 text-lg font-medium"
            disabled={isUploading || queuedCount === 0}
            onClick={handleUploadAll}
          >
            {isUploading
              ? `Uploading ${files.length} bill${files.length !== 1 ? 's' : ''}...`
              : `Upload ${queuedCount} bill${queuedCount !== 1 ? 's' : ''}`}
          </Button>
        )}

        {uploadComplete && doneCount > 0 && (
          <>
            {files.length < MAX_BILLS && (
              <button
                onClick={() => {
                  setUploadComplete(false);
                  inputRef.current?.click();
                }}
                className="w-full h-12 border-2 border-blue text-blue rounded-md font-bold 
                           hover:bg-blue/5 transition-all text-lg"
              >
                + Add More Bills
              </button>
            )}
            <Button
              type="button"
              variant="primary"
              className="w-full h-12 text-lg font-medium"
              onClick={handleAnalyse}
            >
              Analyse {doneCount} Bill{doneCount !== 1 ? 's' : ''} →
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
