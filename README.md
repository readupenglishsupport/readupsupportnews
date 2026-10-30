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
  functions/translate/index.ts   # Edge Function dịch bài bằng Claude (xem mục "Dịch bài chuẩn xác")
  pdf-setup.sql         # chạy 1 lần trong Supabase để bật kho lưu PDF
images/
  placeholder-breaking-news.jpg  # ảnh nền cho tin không có ảnh (muốn đổi: thay file, giữ nguyên tên)
  new-screen.png, new-screen-1.png, ...  # ảnh thông báo (xem mục "Thông báo" bên dưới)
js/
  theme-init.js         # chạy sớm trong <head>: áp theme + cỡ chữ đã lưu (tránh nháy)
  i18n.js               # từ điển Việt/Anh + hàm t()
  app.js                # lõi: đăng nhập, sidebar, reader, highlight, ghi chú, tra cứu
  feed-home.js          # trang chủ: feed nhiều nguồn, chủ đề Logistics / Supply chain
  article-fetch.js      # nút Paste + tải bài báo với nhiều lớp dự phòng (proxy, archive, jina)
  sidebar-active.js     # tô đỏ đúng mục đang ở trong menu trái
  tools.js              # mục "Tiện ích" (sau Yêu thích): thẻ Đọc & ghi chú PDF, thẻ hướng dẫn nén PDF > 50MB (iLovePDF), upload / danh sách / xóa PDF
  pdf-reader.js         # trình đọc PDF: bôi đen tra từ, highlight, ghi chú, thêm chữ lên trang
  pdf-bookmarks.js      # PDF: dấu trang (nút tròn góc trái trên) + ô "Đi đến trang"
  layout.js             # nút ẩn/hiện thanh bên trên màn hình lớn (nhớ lựa chọn)
  glossary.js           # từ điển thuật ngữ Logistics/Supply chain Anh→Việt (sửa/thêm tại đây)
  translate.js          # nút "Dịch bài" + popup bản dịch tiếng Việt
  announce.js           # popup thông báo + chuông (ảnh images/new-screen*.png)
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

## Dịch bài chuẩn xác (nút "Dịch bài" trong bài báo)

Bấm **Dịch bài** → popup hiện toàn bộ bài bằng tiếng Việt. 

- **Miễn phí, không cần cấu hình gì (mặc định):** dịch máy kiểu Google Dịch + thay sẵn thuật ngữ trong `js/glossary.js`. Popup có nhãn "Dịch miễn phí".
- **Tùy chọn (có phí, chuẩn hơn):** bật Edge Function dùng Claude (có tính phí theo API của Anthropic):
  1. Cài Supabase CLI, trong thư mục dự án chạy: `supabase login` rồi `supabase link --project-ref vjvvyadldyvqtjjsscfm`
  2. `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` (lấy key ở console.anthropic.com). Tùy chọn đổi model: `supabase secrets set ANTHROPIC_MODEL=...`
  3. `supabase functions deploy translate`
  4. Mở lại web → popup hiện nhãn xanh "Dịch chuẩn thuật ngữ (Claude)".
  Chỉ người đã đăng nhập mới gọi được; kết quả được lưu tạm trên máy để mở lại không tốn thêm phí (bấm *Dịch lại* để dịch mới).
- Thêm / sửa thuật ngữ: mở `js/glossary.js`, thêm dòng `['english term','bản dịch tiếng Việt']`.

## Thông báo (popup + chuông)

- Ảnh đặt trong `images/` theo thứ tự: `new-screen.png` → `new-screen-1.png` → `new-screen-2.png` → …
- **Đẩy thông báo mới:** upload ảnh kế tiếp (đang có `new-screen.png` thì đặt tên `new-screen-1.png`). Số lớn nhất = ảnh mới nhất.
- Chỉ hiện **sau khi đăng nhập**. Popup ảnh mới nhất bật **mỗi lần tải lại web / đăng nhập**; chuông 🔔 (cạnh nút sáng/tối) có chấm đỏ cho tới khi xem.
- Bấm chuông để xem lại **tất cả** ảnh đã đẩy (mới nhất ở trên cùng, có nhãn "Mới").
- **Tắt 1 thông báo:** xóa file ảnh đó. 
- Popup đóng bằng nút X, bấm ra ngoài, bấm vào ảnh hoặc phím Esc.

## PDF: dấu trang & đi đến trang

- **Dấu trang:** nút tròn góc trái trên cùng của PDF → mở danh sách. Nhập tên (không bắt buộc) rồi bấm *Thêm* để đánh dấu trang đang xem;
  để trống thì tên mặc định là "Trang + số trang". Bấm vào dấu trang để nhảy tới, ✏️ đổi tên, 🗑 xóa. Lưu trong `notes.__pdf.bm`.
- **Đi đến trang:** ô nhỏ nằm ngay dưới ô tròn "trang hiện tại / tổng số trang" (góc dưới phải): gõ số trang rồi bấm mũi tên (hoặc Enter).

## Điều hướng & thanh bên

- Mở bài / Tiện ích / Trang chủ đều tạo 1 mục lịch sử trình duyệt → bấm **Quay lại** (hoặc vuốt back trên điện thoại) sẽ về trang trước trong web, không thoát ra ngoài. Ở Trang chủ bấm Quay lại mới rời web.
- Màn hình lớn: nút ▭ cạnh logo ẩn/hiện thanh bên (nhớ lựa chọn) để PDF rộng hơn. Điện thoại: nút ☰.

## Chạy thử

Mở bằng một web server tĩnh (ví dụ `npx serve .` hoặc `python3 -m http.server`).
