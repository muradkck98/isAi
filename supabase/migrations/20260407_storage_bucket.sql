-- Create scan-images storage bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scan-images',
  'scan-images',
  true,
  5242880, -- 5MB max per image
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload their own scan images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'scan-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read (Sightengine needs a public URL)
CREATE POLICY "Public read access for scan images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'scan-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their own scan images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'scan-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
