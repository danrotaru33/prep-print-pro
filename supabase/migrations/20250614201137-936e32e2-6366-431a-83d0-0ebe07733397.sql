
-- 1. Create a bucket for storing processed files
insert into storage.buckets (id, name, public) values ('processed-files', 'processed-files', false);

-- 2. Create a table for logging processed file metadata
create table public.processed_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  original_filename text not null,
  output_filename text not null,
  format text not null,
  dpi int not null,
  width_mm int not null,
  height_mm int not null,
  bleed_mm int not null,
  cut_line_type text not null,
  file_url text not null,
  processing_status text not null,
  error_message text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 3. Enable row-level security
alter table public.processed_files enable row level security;

-- 4. Policy: all users can insert their own processed file metadata
create policy "Users can insert their own processed files"
  on public.processed_files
  for insert
  with check (user_id = auth.uid());

-- 5. Policy: users can select their own processed files
create policy "Users can view their own processed files"
  on public.processed_files
  for select
  using (user_id = auth.uid());

-- 6. Policy: users can update their own processed file records
create policy "Users can update their own processed files"
  on public.processed_files
  for update
  using (user_id = auth.uid());

-- 7. Policy: users can delete their own processed file records
create policy "Users can delete their own processed files"
  on public.processed_files
  for delete
  using (user_id = auth.uid());
