# Readup Support News

Web app đọc báo, highlight và ghi chú từ vựng (Supabase + Bootstrap 5).

## Cấu trúc

```
index.html              # khung HTML
manifest.webmanifest    # cấu hình PWA
css/
  style.css             # toàn bộ style của app
js/
  theme-init.js         # chạy sớm trong <head>: áp theme + cỡ chữ đã lưu (tránh nháy)
  i18n.js               # từ điển Việt/Anh + hàm t()
  app.js                # lõi: đăng nhập, sidebar, reader, highlight, ghi chú, tra cứu
  feed-home.js          # trang chủ: feed nhiều nguồn, chủ đề Logistics / Supply chain
  article-fetch.js      # nút Paste + tải bài báo với nhiều lớp dự phòng (proxy, archive, jina)
  sidebar-active.js     # tô đỏ đúng mục đang ở trong menu trái
```

> Thứ tự nạp script trong `index.html` quan trọng: `i18n.js` → `app.js` → các file còn lại
> (các file sau ghi đè/mở rộng hàm của `app.js`).

## Chạy thử

Mở bằng một web server tĩnh (ví dụ `npx serve .` hoặc `python3 -m http.server`).
