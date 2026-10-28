/* =====================================================================
   PDF: Dấu trang + Đi đến trang nhanh
   - Dấu trang lưu trong articles.notes.__pdf.bm = [{id, p (số trang), n (tên; '' = mặc định "Trang p")}]
   - Nút tròn nằm góc trái trên cùng của PDF (dính theo khi cuộn) → mở danh sách dấu trang.
   - Ô "Đi đến trang" nằm ngay dưới ô tròn "trang hiện tại / tổng số trang" (góc dưới phải).
   Nạp sau pdf-reader.js (dùng P, pageEl, pdfCurPage, pdfTip, pdfSaveSoon của file đó).
   ===================================================================== */
const bmName=b=>(b.n||'').trim()||(t('pdfPage')+' '+b.p);
const bmSorted=()=>P.bm.slice().sort((a,b)=>a.p-b.p||String(a.id).localeCompare(String(b.id)));

/* ---------- Đi đến trang ---------- */
function pdfGoTo(n){
  if(!P.doc) return false;
  n=Math.min(P.doc.numPages,Math.max(1,Math.round(+n)||1));
  const go=(max)=>{ const el=pageEl(n); if(!el) return; const d=el.getBoundingClientRect().top-70; if(Math.abs(d)>3&&Math.abs(d)<max) window.scrollBy(0,d); };
  go(Infinity);
  /* trang xung quanh vừa vẽ xong có thể làm lệch vị trí → căn lại 2 lần (chỉ khi lệch ít, tránh giật khi bạn đang cuộn) */
  [250,700].forEach(ms=>setTimeout(()=>{ if(P.doc) go(600); },ms));
  return n;
}
function pdfJumpGo(){
  const i=$('#pdfJump'); if(!i) return; const v=parseInt(i.value,10);
  if(!P.doc||!v){ i.focus(); return; }
  const n=pdfGoTo(v); i.value=''; i.blur(); bmClose(); if(n) pdfTip(t('pdfPage')+' '+n);
}

/* ---------- Dấu trang ---------- */
function pdfBmMount(){
  const box=$('#pdfBm'); if(!box) return;
  box.innerHTML=`<button type="button" id="pdfBmBtn" class="pdf-bm-btn" title="${esc(t('bmTitle'))}" aria-label="${esc(t('bmTitle'))}" aria-expanded="false"><i class="bi bi-bookmarks-fill"></i><span id="pdfBmCnt" class="pdf-bm-cnt"></span></button>
    <div id="pdfBmPanel" class="pdf-bm-panel" role="dialog">
      <div class="pdf-bm-head"><i class="bi bi-bookmarks me-2"></i><span data-i18n="bmTitle">${esc(t('bmTitle'))}</span></div>
      <div id="pdfBmList" class="pdf-bm-list"></div>
      <div class="pdf-bm-add"><input id="pdfBmName" type="text" maxlength="80" autocomplete="off" enterkeyhint="done"><button type="button" id="pdfBmAdd" class="btn btn-sm btn-primary"><i class="bi bi-bookmark-plus me-1"></i><span data-i18n="bmAdd">${esc(t('bmAdd'))}</span></button></div>
    </div>`;
  $('#pdfBmBtn').onclick=e=>{ e.stopPropagation(); bmToggle(); };
  $('#pdfBmAdd').onclick=bmAdd;
  $('#pdfBmName').addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); bmAdd(); } });
  $('#pdfBmList').onclick=bmListClick;
  const j=$('#pdfJump'), jb=$('#pdfJumpBtn');
  if(j){ j.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); pdfJumpGo(); } }); j.addEventListener('input',()=>{ j.value=j.value.replace(/\D/g,'').slice(0,5); }); j.addEventListener('focus',()=>bmClose()); }
  if(jb) jb.onclick=pdfJumpGo;
  pdfBmRender();
}
function pdfBmRender(){
  const list=$('#pdfBmList'); if(!list) return;
  const cnt=$('#pdfBmCnt'); if(cnt){ cnt.textContent=P.bm.length||''; cnt.style.display=P.bm.length?'flex':'none'; }
  const nm=$('#pdfBmName'); if(nm) nm.placeholder=t('bmNamePh');
  const here=P.doc?pdfCurPage():1, bs=bmSorted();
  list.innerHTML=bs.length?bs.map(b=>`<div class="pdf-bm-item${b.p===here?' here':''}" data-id="${esc(b.id)}">
      <button type="button" class="pdf-bm-go" data-k="go"><i class="bi bi-bookmark-fill"></i><span class="pdf-bm-name">${esc(bmName(b))}</span><span class="pdf-bm-pg">${esc(t('pdfPage'))} ${b.p}</span></button>
      <button type="button" class="pdf-bm-ic" data-k="ren" title="${esc(t('bmRename'))}" aria-label="${esc(t('bmRename'))}"><i class="bi bi-pencil"></i></button>
      <button type="button" class="pdf-bm-ic text-danger" data-k="del" title="${esc(t('bmDel'))}" aria-label="${esc(t('bmDel'))}"><i class="bi bi-trash"></i></button></div>`).join('')
    :`<div class="pdf-bm-none">${esc(t('bmNone'))}</div>`;
}
function bmOpen(){ const p=$('#pdfBmPanel'); if(!p) return; pdfBmRender(); p.classList.add('on'); $('#pdfBmBtn').setAttribute('aria-expanded','true'); }
function bmClose(){ const p=$('#pdfBmPanel'); if(!p||!p.classList.contains('on')) return; p.classList.remove('on'); const b=$('#pdfBmBtn'); if(b) b.setAttribute('aria-expanded','false'); }
function bmToggle(){ const p=$('#pdfBmPanel'); if(p&&p.classList.contains('on')) bmClose(); else bmOpen(); }
function bmAdd(){
  if(!P.doc) return; const inp=$('#pdfBmName'), p=pdfCurPage();
  P.bm.push({id:'b'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),p,n:(inp.value||'').trim()});
  inp.value=''; pdfBmRender(); pdfSaveSoon(); pdfTip(t('bmAdded')+' · '+t('pdfPage')+' '+p);
}
function bmListClick(e){
  const b=e.target.closest('[data-k]'); if(!b) return; const row=b.closest('.pdf-bm-item'), bm=P.bm.find(x=>x.id===row.dataset.id); if(!bm) return;
  if(b.dataset.k==='go'){ bmClose(); pdfGoTo(bm.p); pdfTip(bmName(bm)); }
  else if(b.dataset.k==='del'){ P.bm=P.bm.filter(x=>x.id!==bm.id); pdfBmRender(); pdfSaveSoon(); pdfTip(t('bmDeleted')); }
  else if(b.dataset.k==='ren'){
    const nameEl=row.querySelector('.pdf-bm-name'); if(!nameEl||row.querySelector('input')) return;
    const inp=document.createElement('input'); inp.type='text'; inp.maxLength=80; inp.className='pdf-bm-edit'; inp.value=bm.n||''; inp.placeholder=t('pdfPage')+' '+bm.p;
    row.classList.add('editing'); row.querySelector('.pdf-bm-go').replaceWith(inp); inp.focus(); inp.select();
    let done=false; const fin=ok=>{ if(done) return; done=true; if(ok){ bm.n=inp.value.trim(); pdfSaveSoon(); } pdfBmRender(); };
    inp.addEventListener('keydown',ev=>{ if(ev.key==='Enter'){ ev.preventDefault(); fin(true); } else if(ev.key==='Escape'){ ev.stopPropagation(); fin(false); } });
    inp.addEventListener('blur',()=>fin(true));
  }
}
/* bấm ra ngoài / Esc → đóng danh sách */
document.addEventListener('click',e=>{ if(!e.target.closest('#pdfBm')) bmClose(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') bmClose(); });
