# Readup Support News

Web app đọc báo, highlight và ghi chú từ vựng (Supabase + Bootstrap 5).

## Cấu trúc

```
index.html              # khung HTML
manifest.webmanifest    # cấu hình PWA
css/
  style.css             # style chung của app
  pdf.css               # style cho Tiện ích + trình đọc PDF
supabase/
  pdf-setup.sql         # chạy 1 lần trong Supabase để bật kho lưu PDF
images/
  placeholder-breaking-news.jpg  # ảnh nền cho tin không có ảnh (muốn đổi: thay file, giữ nguyên tên)
js/
  theme-init.js         # chạy sớm trong <head>: áp theme + cỡ chữ đã lưu (tránh nháy)
  i18n.js               # từ điển Việt/Anh + hàm t()
  app.js                # lõi: đăng nhập, sidebar, reader, highlight, ghi chú, tra cứu
  feed-home.js          # trang chủ: feed nhiều nguồn, chủ đề Logistics / Supply chain
  article-fetch.js      # nút Paste + tải bài báo với nhiều lớp dự phòng (proxy, archive, jina)
  sidebar-active.js     # tô đỏ đúng mục đang ở trong menu trái
  tools.js              # mục "Tiện ích" (sau Yêu thích): trang tiện ích, upload / danh sách / xóa PDF
  pdf-reader.js         # trình đọc PDF: bôi đen tra từ, highlight, ghi chú, thêm chữ lên trang
```

## Bật tính năng PDF (làm 1 lần)

1. Vào Supabase → **SQL Editor** → dán nội dung `supabase/pdf-setup.sql` → Run.
   (Tạo kho riêng tư `pdfs`, tối đa 50MB / file, mỗi người chỉ thấy file của mình.)
2. Nếu Dashboard → Storage → Settings đang đặt giới hạn file toàn cục thấp hơn 50MB thì tăng lên ≥ 50MB.
3. Trong app: menu trái → **Tiện ích** → **Tải PDF lên**.

Highlight, ghi chú và chữ thêm vào PDF được lưu trong cột `notes` (khóa `__pdf`) của bảng `articles`;
file PDF gốc không bị sửa.

> Thứ tự nạp script trong `index.html` quan trọng: `i18n.js` → `app.js` → các file còn lại
> (các file sau ghi đè/mở rộng hàm của `app.js`).

## Chạy thử

Mở bằng một web server tĩnh (ví dụ `npx serve .` hoặc `python3 -m http.server`).
