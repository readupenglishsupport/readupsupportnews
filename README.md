# Readup Support News

Web app đọc báo, highlight và ghi chú từ vựng (Supabase + Bootstrap 5).

## Cấu trúc

```
index.html              # khung HTML
manifest.webmanifest    # cấu hình PWA
css/
  style.css             # style chung của app
  pdf.css               # style cho Tiện ích + trình đọc PDF (gồm dấu trang, ô đi đến trang)
  announce.css          # style popup thông báo
supabase/
  pdf-setup.sql         # chạy 1 lần trong Supabase để bật kho lưu PDF
images/
  placeholder-breaking-news.jpg  # ảnh nền cho tin không có ảnh (muốn đổi: thay file, giữ nguyên tên)
  new-screen.png                 # ảnh popup thông báo (xem mục "Thông báo" bên dưới)
js/
  theme-init.js         # chạy sớm trong <head>: áp theme + cỡ chữ đã lưu (tránh nháy)
  i18n.js               # từ điển Việt/Anh + hàm t()
  app.js                # lõi: đăng nhập, sidebar, reader, highlight, ghi chú, tra cứu
  feed-home.js          # trang chủ: feed nhiều nguồn, chủ đề Logistics / Supply chain
  article-fetch.js      # nút Paste + tải bài báo với nhiều lớp dự phòng (proxy, archive, jina)
  sidebar-active.js     # tô đỏ đúng mục đang ở trong menu trái
  tools.js              # mục "Tiện ích" (sau Yêu thích): trang tiện ích, upload / danh sách / xóa PDF
  pdf-reader.js         # trình đọc PDF: bôi đen tra từ, highlight, ghi chú, thêm chữ lên trang
  pdf-bookmarks.js      # PDF: dấu trang (nút tròn góc trái trên) + ô "Đi đến trang"
  announce.js           # popup thông báo khi mở web (ảnh images/new-screen.png)
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

## Thông báo (popup khi mở web)

- Ảnh hiển thị: `images/new-screen.png`. PNG nền trong suốt thì popup cũng trong suốt (không có khung trắng).
- **Đổi ảnh:** upload ảnh mới, đặt đúng tên `new-screen.png` (ghi đè file cũ).
- **Tắt thông báo:** xóa file `images/new-screen.png` — web tự bỏ qua, không báo lỗi.
- Popup hiện 1 lần mỗi lần mở app (sau khi đăng nhập). Đóng bằng nút X, bấm ra ngoài, bấm vào ảnh hoặc phím Esc.
- Muốn xem thử ngay: thêm `?announce` vào cuối link (ví dụ `https://.../?announce`).

## PDF: dấu trang & đi đến trang

- **Dấu trang:** nút tròn góc trái trên cùng của PDF → mở danh sách. Nhập tên (không bắt buộc) rồi bấm *Thêm* để đánh dấu trang đang xem;
  để trống thì tên mặc định là "Trang + số trang". Bấm vào dấu trang để nhảy tới, ✏️ đổi tên, 🗑 xóa. Lưu trong `notes.__pdf.bm`.
- **Đi đến trang:** ô nhỏ nằm ngay dưới ô tròn "trang hiện tại / tổng số trang" (góc dưới phải): gõ số trang rồi bấm mũi tên (hoặc Enter).

## Chạy thử

Mở bằng một web server tĩnh (ví dụ `npx serve .` hoặc `python3 -m http.server`).
