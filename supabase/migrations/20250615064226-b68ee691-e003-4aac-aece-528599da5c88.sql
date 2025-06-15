
-- Create RLS policies for the processed-files storage bucket
-- Policy to allow authenticated users to insert their own files
CREATE POLICY "Users can upload their own processed files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'processed-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy to allow authenticated users to select their own files
CREATE POLICY "Users can view their own processed files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'processed-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy to allow authenticated users to update their own files
CREATE POLICY "Users can update their own processed files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'processed-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy to allow authenticated users to delete their own files
CREATE POLICY "Users can delete their own processed files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'processed-files' AND auth.uid()::text = (storage.foldername(name))[1]);
