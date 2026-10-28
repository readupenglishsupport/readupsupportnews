/* =====================================================================
   Thông báo bằng ảnh (popup + biểu tượng chuông lưu lại tất cả ảnh)
   - Ảnh đặt trong thư mục images/ theo thứ tự:  new-screen.png (cũ nhất) → new-screen-1.png → new-screen-2.png → ...
   - Muốn ĐẨY thông báo mới: upload ảnh kế tiếp, ví dụ đã có new-screen.png thì đặt tên new-screen-1.png.
     Ảnh có số lớn nhất = ảnh MỚI NHẤT (popup bật mỗi lần mở web / đăng nhập, chuông có chấm đỏ tới khi xem).
   - Chuông ở thanh trên cùng: lưu toàn bộ các ảnh thông báo, mới nhất ở trên cùng.
   - Chỉ hiện SAU KHI ĐĂNG NHẬP. Popup ảnh mới nhất bật lại mỗi lần tải lại web hoặc đăng nhập.
   - Muốn TẮT 1 thông báo: xóa file ảnh đó. 
   ===================================================================== */
const ANN_DIR='images/', ANN_BASE='new-screen', ANN_EXT='.png', ANN_MAX=30;   /* dò tối đa new-screen-30.png */
const annName=i=>ANN_DIR+ANN_BASE+(i?'-'+i:'')+ANN_EXT;
let annBusy=false, annList=[];            /* annList: [{i, src}] xếp MỚI NHẤT → CŨ NHẤT */

/* Kiểm tra 1 ảnh có tồn tại không (một số host trả trang HTML thay vì 404 → kiểm tra content-type) */
async function annExists(src){
  try{
    const r=await fetch(src,{method:'HEAD',cache:'no-cache'});
    return r.ok&&/^image\//i.test(r.headers.get('content-type')||'');
  }catch(e){   /* mở bằng file:// thì fetch bị chặn → thử nạp bằng thẻ <img> */
    return new Promise(ok=>{ const im=new Image(); im.onload=()=>ok(true); im.onerror=()=>ok(false); im.src=src; });
  }
}
/* Dò tất cả ảnh new-screen, new-screen-1, ... (song song, bỏ qua chỗ trống) */
async function annScan(){
  const idx=Array.from({length:ANN_MAX+1},(_,i)=>i);
  const ok=await Promise.all(idx.map(i=>annExists(annName(i))));
  annList=idx.filter(i=>ok[i]).map(i=>({i,src:annName(i)})).sort((a,b)=>b.i-a.i);
  return annList;
}
const annSeen=()=>{ try{ const v=parseInt(localStorage.getItem('annSeenIdx'),10); return isNaN(v)?-1:v; }catch(e){ return -1; } };
const annMarkSeen=i=>{ try{ if(i>annSeen()) localStorage.setItem('annSeenIdx',String(i)); }catch(e){} annBadge(); };
const annUnseen=()=>annList.length&&annList[0].i>annSeen();
function annBadge(){ const b=document.getElementById('bellDot'); if(b) b.style.display=annUnseen()?'block':'none'; }

/* ---------- Popup ảnh mới nhất ---------- */
async function showAnnounce(force){
  if(annBusy||document.getElementById('annOv')||!annList.length) return;
  annBusy=true;
  try{
    const top=annList[0];
    const img=new Image(); img.src=top.src+'?v='+top.i;
    try{ await img.decode(); }catch(e){ if(!img.naturalWidth) return; }
    img.className='ann-img'; img.alt=''; img.draggable=false;
    const ov=document.createElement('div'); ov.id='annOv'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
    const box=document.createElement('div'); box.className='ann-box';
    const x=document.createElement('button'); x.type='button'; x.className='ann-x'; x.innerHTML='<i class="bi bi-x-lg"></i>'; x.setAttribute('aria-label',t('close')); x.title=t('close');
    box.append(img,x); ov.appendChild(box); document.body.appendChild(ov);
    const prevOv=document.body.style.overflow; document.body.style.overflow='hidden';
    const close=()=>{ document.removeEventListener('keydown',key,true); ov.classList.remove('on'); document.body.style.overflow=prevOv; setTimeout(()=>ov.remove(),300); };
    const key=e=>{ if(e.key==='Escape'){ e.stopPropagation(); close(); } };
    document.addEventListener('keydown',key,true);
    x.onclick=e=>{ e.stopPropagation(); close(); };
    ov.onclick=close;                       /* bấm ra ngoài hoặc bấm vào ảnh đều đóng */
    requestAnimationFrame(()=>requestAnimationFrame(()=>{ ov.classList.add('on'); }));
    annMarkSeen(top.i);
  }finally{ annBusy=false; }
}

/* ---------- Chuông: danh sách tất cả thông báo ---------- */
function annRenderList(){
  const box=document.getElementById('annList'); if(!box) return;
  box.innerHTML=annList.length
    ?annList.map((a,k)=>`<div class="ann-item">${k===0?`<span class="ann-new">${t('notifNew')}</span>`:''}<img src="${a.src}?v=${a.i}" alt="" loading="lazy"></div>`).join('')
    :`<div class="text-center text-muted small py-4">${t('notifNone')}</div>`;
}
function annOpenBell(){
  annRenderList();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('annModal')).show();
  if(annList.length) annMarkSeen(annList[0].i);
}
document.addEventListener('click',e=>{ if(e.target.closest('#bellBtn')) annOpenBell(); });
/* đổi ngôn ngữ khi đang mở danh sách → vẽ lại nhãn "Mới" */
(()=>{ const _al=applyLang; applyLang=function(){ const r=_al.apply(this,arguments); if(document.getElementById('annModal')?.classList.contains('show')) annRenderList(); return r; }; })();

/* ---------- Chỉ chạy SAU KHI ĐĂNG NHẬP: bọc boot() của app.js ---------- */
(()=>{
  const _boot=boot;
  boot=async function(session){
    const r=await _boot.apply(this,arguments);
    if(session&&session.user){
      try{ await annScan(); }catch(e){ annList=[]; }
      annBadge();
      showAnnounce();
    }
    return r;
  };
})();
