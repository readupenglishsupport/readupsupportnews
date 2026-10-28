/* ===== Mục "Tiện ích" (nằm sau "Yêu thích" trong menu trái) =====
   Hiện tại có 1 tiện ích: Đọc & ghi chú PDF. Muốn thêm tiện ích mới → thêm 1 phần tử vào TOOLS. */
/* PDF_BUCKET (tên kho) và PDF_MAX (giới hạn upload 50MB) khai báo trong pdf-reader.js */
let toolsOn=false;

const COMPRESS_URL='https://www.ilovepdf.com/vi/giam-dung-l%C6%B0%E1%BB%A3ng-pdf';   /* trang nén PDF (iLovePDF) */
const TOOLS=[
  { id:'pdf', icon:'bi-file-earmark-pdf', name:'pdfName', desc:'pdfDesc', note:'pdfMax', action:'pdfUp', btnIcon:'bi-upload', run:()=>$('#pdfIn').click() },
  /* Thẻ hướng dẫn nén PDF > 50MB: có href → hiện nút mở link ở tab mới (không cần run) */
  { id:'zip', icon:'bi-file-earmark-zip', name:'zipName', desc:'zipDesc', note:'zipNote', action:'zipGo', btnIcon:'bi-box-arrow-up-right', href:COMPRESS_URL }
];

/* ---------- Trang Tiện ích ---------- */
/* keep===true: vẽ lại trang Tiện ích tại chỗ (đổi ngôn ngữ) — không cuộn lên đầu, không đóng menu */
function showTools(keep){
  keep=keep===true;
  if(typeof closePdf==='function') closePdf();
  cur=null; toolsOn=true; hideAll(); if(!keep) closeSide();
  try{ history.replaceState(null,'',location.pathname+location.search); localStorage.removeItem('last'); }catch(e){}
  document.title=t('toolsTitle')+' · Readup Support News';
  $('#readerBox').innerHTML=`<div class="reader-card enter">
    <h5 class="fw-bold mb-3"><i class="bi bi-grid-3x3-gap me-2" style="color:var(--brand-t)"></i>${t('toolsTitle')}</h5>
    <div class="row g-3">${TOOLS.map(x=>`<div class="col-md-6"><div class="tool-card h-100">
      <div class="tool-ico"><i class="bi ${x.icon}"></i></div>
      <div class="fw-bold">${t(x.name)}</div>
      <div class="small text-muted mb-2 tool-desc">${t(x.desc)}</div>
      ${x.href?`<a class="btn btn-primary btn-sm" href="${x.href}" target="_blank" rel="noopener noreferrer"><i class="bi ${x.btnIcon} me-1"></i>${t(x.action)}</a>`
        :`<button class="btn btn-primary btn-sm" data-tool="${x.id}"><i class="bi ${x.btnIcon} me-1"></i>${t(x.action)}</button>`}
      <span class="small text-muted ms-2">${t(x.note)}</span>
    </div></div>`).join('')}</div>
    <input type="file" id="pdfIn" accept="application/pdf,.pdf" hidden>
  </div>
  <div class="reader-card enter mt-3"><h6 class="fw-bold mb-3"><i class="bi bi-files me-2"></i>${t('pdfList')}</h6><div id="pdfList"></div></div>`;
  $('#readerBox').querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>TOOLS.find(x=>x.id===b.dataset.tool).run());
  $('#pdfIn').onchange=e=>{ const f=e.target.files[0]; e.target.value=''; uploadPdf(f); };
  $('#pdfList').onclick=onPdfListClick;
  renderPdfList(); renderSide(); if(!keep) window.scrollTo({top:0});
}
function renderPdfList(){
  const box=$('#pdfList'); if(!box) return;
  box.innerHTML=pdfs.length?pdfs.map(a=>`<div class="pdf-row" data-open="${a.id}"><i class="bi bi-file-earmark-pdf-fill text-danger fs-4"></i>
    <div class="flex-grow-1 min-w-0"><div class="pdf-name">${esc(a.title)}</div><div class="small text-muted">${new Date(a.created_at).toLocaleString(loc())}</div></div>
    <button class="btn btn-sm btn-outline-danger" data-del="${a.id}" aria-label="${t('delOk')}"><i class="bi bi-trash"></i></button></div>`).join('')
    :`<div class="small text-muted">${t('pdfNone')}</div>`;
}
async function onPdfListClick(e){
  const del=e.target.closest('[data-del]');
  if(del){ e.stopPropagation(); const a=pdfs.find(x=>x.id===del.dataset.del); if(a&&await ask(t('pdfDel'),t('delOk'))) await deletePdf(a); return; }
  const row=e.target.closest('[data-open]'); if(!row) return;
  loader(true); const {data}=await sb.from('articles').select('*').eq('id',row.dataset.open).single(); loader(false);
  if(data) openArticle(data);
}

/* ---------- Tải lên / xóa ---------- */
async function uploadPdf(file){
  if(!file) return;
  if(file.type!=='application/pdf'&&!/\.pdf$/i.test(file.name)) return alert(t('pdfNotPdf'));
  if(file.size>PDF_MAX) return alert(t('pdfTooBig').replace('{mb}',(file.size/1048576).toFixed(1)));
  const safe=file.name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w.-]+/g,'_').replace(/_+/g,'_').slice(-80);
  const path=`${user.id}/${Date.now()}-${safe}`;
  loader(true);
  try{
    const up=await sb.storage.from(PDF_BUCKET).upload(path,file,{contentType:'application/pdf',upsert:false});
    if(up.error) throw up.error;
    const row={user_id:user.id,url:'pdf:'+path,title:file.name.replace(/\.pdf$/i,''),content:'',notes:{},folder_id:null};
    let r=await sb.from('articles').insert({...row,meta:{type:'pdf',size:file.size}}).select().single();
    if(r.error&&/meta/i.test(r.error.message)) r=await sb.from('articles').insert(row).select().single();
    if(r.error){ await sb.storage.from(PDF_BUCKET).remove([path]); throw r.error; }
    await loadData(); toast(t('pdfUpDone')); openArticle(r.data);
  }catch(e){ alert(pdfErr(e)); }
  loader(false);
}
async function deletePdf(a){
  await sb.storage.from(PDF_BUCKET).remove([a.url.slice(4)]);
  const {error}=await sb.from('articles').delete().eq('id',a.id); if(error) return alert(error.message);
  await loadData(); renderPdfList(); toast(t('deleted'));
}

/* ---------- Menu trái: nút Tiện ích + tô đỏ đúng mục ---------- */
$('#navTools').onclick=showTools;
(()=>{
  const _se=showEmpty, _rs=renderSide;
  showEmpty=function(){ toolsOn=false; if(typeof closePdf==='function') closePdf(); return _se.apply(this,arguments); };
  renderSide=function(){
    _rs.apply(this,arguments);
    const on=toolsOn||(cur&&isPdfRow(cur));
    $('#navTools').classList.toggle('on',!!on);
    if(on) document.querySelectorAll('#navHome,#navAll,#navFav,#folderList .nav-item-x').forEach(n=>n.classList.remove('on'));
  };
  document.addEventListener('click',e=>{ if(e.target.closest('#navAll,#navFav,#folderList [data-f]')&&!e.target.closest('[data-del]')){ toolsOn=false; renderSide(); } },true);
  /* mở bài báo thường từ danh sách → rời trang Tiện ích */
  const _oa=openArticle; openArticle=function(a){ if(!isPdfRow(a)){ toolsOn=false; if(isPdfRow(cur)) closePdf(); } return _oa.apply(this,arguments); };
})();

/* ---------- Đổi ngôn ngữ khi đang ở trang Tiện ích → ở lại trang này (không văng về Trang chủ) ---------- */
(()=>{
  const _al=applyLang;
  applyLang=function(){
    if(!(toolsOn&&user&&!cur)) return _al.apply(this,arguments);
    const se=showEmpty; showEmpty=function(){};        /* chặn nhánh "về Trang chủ" của applyLang */
    try{ _al.apply(this,arguments); }finally{ showEmpty=se; }
    showTools(true);
  };
})();
