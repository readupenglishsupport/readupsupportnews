/* =====================================================================
   Thông báo khi mở web (giống popup của Shopee)
   - Ảnh thông báo: images/new-screen.png   (PNG trong suốt thì nền popup cũng trong suốt)
   - Muốn ĐỔI ảnh : upload ảnh mới và đặt đúng tên new-screen.png (ghi đè file cũ).
   - Muốn TẮT     : xóa file images/new-screen.png → web tự bỏ qua, không báo lỗi.
   - Hiện 1 lần mỗi phiên (đóng app rồi mở lại sẽ hiện lại). Thêm ?announce vào link để ép hiện ngay (để thử ảnh mới).
   ===================================================================== */
const ANN_SRC='images/new-screen.png';
let annBusy=false;

/* Lấy ảnh: hỏi lại server mỗi lần (no-cache) nên thay ảnh là thấy ngay; ảnh không đổi thì server trả 304, không tải lại.
   Không có file / không phải ảnh (một số host trả trang HTML thay vì 404) → null. */
async function annLoad(){
  try{
    const r=await fetch(ANN_SRC,{cache:'no-cache'});
    if(!r.ok||!/^image\//i.test(r.headers.get('content-type')||'')) return null;
    const b=await r.blob(); return b.size?URL.createObjectURL(b):null;
  }catch(e){
    /* mở trực tiếp bằng file:// thì fetch bị chặn → thử nạp bằng thẻ <img> */
    return new Promise(ok=>{ const i=new Image(); i.onload=()=>ok(ANN_SRC); i.onerror=()=>ok(null); i.src=ANN_SRC; });
  }
}
async function showAnnounce(force){
  if(annBusy||document.getElementById('annOv')) return;
  let seen=false; try{ seen=sessionStorage.getItem('annSeen')==='1'; }catch(e){}
  if(seen&&!force) return;
  annBusy=true;
  try{
    const src=await (window.__annP||annLoad()); window.__annP=null; if(!src) return;
    const img=new Image(); img.src=src;
    try{ await img.decode(); }catch(e){ if(!img.naturalWidth) return; }
    img.className='ann-img'; img.alt=''; img.draggable=false;
    const ov=document.createElement('div'); ov.id='annOv'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
    const box=document.createElement('div'); box.className='ann-box';
    const x=document.createElement('button'); x.type='button'; x.className='ann-x'; x.innerHTML='<i class="bi bi-x-lg"></i>'; x.setAttribute('aria-label',t('close')); x.title=t('close');
    box.append(img,x); ov.appendChild(box); document.body.appendChild(ov);
    const prevOv=document.body.style.overflow; document.body.style.overflow='hidden';
    const close=()=>{ document.removeEventListener('keydown',key,true); ov.classList.remove('on'); document.body.style.overflow=prevOv; setTimeout(()=>{ ov.remove(); if(src.startsWith('blob:')) URL.revokeObjectURL(src); },300); };
    const key=e=>{ if(e.key==='Escape'){ e.stopPropagation(); close(); } };
    document.addEventListener('keydown',key,true);
    x.onclick=e=>{ e.stopPropagation(); close(); };
    ov.onclick=close;                       /* bấm ra ngoài hoặc bấm vào ảnh đều đóng */
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ ov.classList.add('on'); }));
    try{ sessionStorage.setItem('annSeen','1'); }catch(e){}
  }finally{ annBusy=false; }
}

/* Hiện NGAY khi ảnh sẵn sàng (không chờ đăng nhập / tải dữ liệu). Ảnh đã được tải song song từ <head> của index.html */
showAnnounce(/[?&]announce\b/.test(location.search));
