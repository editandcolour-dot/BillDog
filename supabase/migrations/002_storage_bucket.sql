-- Note: Bucket creation must be done via Supabase dashboard (Storage > Create Bucket: "bills", turn OFF Public toggle).
-- This migration ONLY adds the restrictive storage RLS policies for the "bills" bucket.

-- Enable RLS on storage objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only upload objects to the 'bills' bucket into their own UID folder
CREATE POLICY "Users can upload own bills"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'bills' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can only view their own bills in the 'bills' bucket
CREATE POLICY "Users can view own bills"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'bills' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can only delete their own bills
CREATE POLICY "Users can delete own bills"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'bills' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
