-- Chạy file này MỘT LẦN trong Supabase → SQL Editor để bật tính năng upload PDF.
-- Tạo kho lưu "pdfs" (riêng tư, tối đa 50MB / file, chỉ nhận PDF)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdfs', 'pdfs', false, 52428800, array['application/pdf'])
on conflict (id) do update
  set file_size_limit = 52428800,
      allowed_mime_types = array['application/pdf'];

-- Mỗi người dùng chỉ thấy / tải lên / xóa file trong thư mục mang user id của mình
drop policy if exists "pdfs_select_own" on storage.objects;
drop policy if exists "pdfs_insert_own" on storage.objects;
drop policy if exists "pdfs_delete_own" on storage.objects;

create policy "pdfs_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "pdfs_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "pdfs_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'pdfs' and (storage.foldername(name))[1] = auth.uid()::text);

-- Lưu ý: nếu project của bạn đang đặt giới hạn file toàn cục thấp hơn 50MB
-- (Dashboard → Storage → Settings → Global file size limit) thì hãy tăng lên ≥ 50MB.
