/* =====================================================================
   Đọc PDF: giữ nguyên định dạng, bôi đen để highlight / tra từ / ghi chú,
   và thêm ô chữ lên trên trang. Dùng PDF.js (nạp khi cần).
   - File PDF lưu ở Supabase Storage (bucket "pdfs"), bảng articles chỉ giữ 1 dòng
     với url = 'pdf:<đường dẫn file>'.
   - Highlight + ô chữ lưu trong articles.notes.__pdf  (toạ độ theo tỉ lệ trang).
   ===================================================================== */
const PDF_BUCKET='pdfs', PDF_MAX=50*1024*1024;
const PDFJS_CDN='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
const TX_COLORS=['#111111','#d11a1a','#1565c0','#2e7d32','#f57f17'];
const P={id:null,doc:null,seq:0,zoom:1,ratio:1.4142,ratios:[],hl:[],tx:[],obs:null,addMode:false,saveT:0,jsP:null};
const isPdfArt=isPdfRow;
const isPdf=()=>isPdfArt(cur);
function closePdf(){ pdfTeardown(); }   /* tools.js gọi khi rời khỏi file PDF */
const pdfDiv=c=>{ const d=document.createElement('div'); d.className=c; return d; };

/* ---------- Nạp PDF.js ---------- */
function loadPdfJs(){
  if(window.pdfjsLib) return Promise.resolve();
  return P.jsP||(P.jsP=new Promise((ok,no)=>{
    const s=document.createElement('script'); s.src=PDFJS_CDN+'pdf.min.js';
    s.onload=()=>{ pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS_CDN+'pdf.worker.min.js'; ok(); };
    s.onerror=()=>{ P.jsP=null; no(new Error('pdf.js')); };
    document.head.appendChild(s);
  }));
}
const pdfErr=e=>{ const m=(e&&e.message)||String(e||''); return /bucket not found|row-level security|not found|policy/i.test(m)?t('pdfNoBucket'):m||t('pdfLoadFail'); };

/* ---------- Mở bài PDF ---------- */
async function openPdf(a,keep,restore){
  if(keep&&P.id===a.id&&$('#pdfPages')){ pdfLabels(); return; }
  pdfTeardown();
  cur=a; cur.notes=cur.notes||{}; toolsOn=false; renderSide(); lastOpen=Date.now();
  if(!keep){ hideAll(); try{ history.replaceState(null,'','#id='+a.id); localStorage.setItem('last',a.id); }catch(e){} }
  document.title=a.title+' · Readup Support News';
  const st=cur.notes.__pdf||{}; P.id=a.id; P.hl=(st.hl||[]).map(x=>({...x})); P.tx=(st.tx||[]).map(x=>({...x}));
  P.zoom=Math.min(3,Math.max(.5,+lsGet('pdfz')||1)); P.ratios=[]; P.addMode=false; document.body.classList.remove('pdf-adding');
  const my=++P.seq, b=(k,i,tt,x='')=>`<button class="btn btn-sm btn-outline-secondary ${x}" id="${k}" data-i18n-title="${tt}" title="${t(tt)}"><i class="bi ${i}"></i></button>`;
  $('#readerBox').innerHTML=`<div class="reader-card pdf-card${keep?'':' enter'}" id="pdfWrap">
    <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
      <button class="btn btn-sm btn-outline-secondary" id="pdfBack" data-i18n-title="pdfBack" title="${t('pdfBack')}"><i class="bi bi-arrow-left"></i></button>
      <h1 class="fw-bold mb-0 me-auto text-break" style="font-size:clamp(1.1rem,2.4vw,1.5rem)"><i class="bi bi-file-earmark-pdf text-danger me-2"></i>${esc(a.title)}</h1>
      <div class="btn-group btn-group-sm">${b('pdfZo','bi-dash-lg','pdfZoomOut')}<button class="btn btn-sm btn-outline-secondary" id="pdfZv" style="min-width:56px" tabindex="-1">100%</button>${b('pdfZi','bi-plus-lg','pdfZoomIn')}${b('pdfFit','bi-arrows-expand','pdfFit')}</div>
      <button class="btn btn-sm btn-outline-primary" id="pdfAdd" title="${t('pdfAddText')}"><i class="bi bi-fonts me-1"></i><span class="d-none d-sm-inline" data-i18n="pdfAddText">${t('pdfAddText')}</span></button>
      ${b('pdfDl','bi-download','pdfDl')}
    </div>
    <div class="small text-muted mb-2"><i class="bi bi-lightbulb text-warning me-1"></i><span data-i18n="pdfHint">${t('pdfHint')}</span></div>
    <div id="reader" class="pdf-reader"><div class="text-center text-muted py-5"><span class="spinner-border spinner-border-sm me-2"></span>${t('pdfLoading')}</div></div>
    <div id="pdfBadge" class="pdf-badge"><input id="pdfPg" inputmode="numeric" aria-label="${t('pdfPage')}"> / <span id="pdfTot">–</span></div></div>`;
  pdfWire(); pdfZoomLabel(); pdfFabMake();
  try{
    await loadPdfJs();
    const {data,error}=await sb.storage.from(PDF_BUCKET).createSignedUrl(a.url.slice(4),21600); if(error) throw error;
    const doc=await pdfjsLib.getDocument({url:data.signedUrl,disableAutoFetch:true,rangeChunkSize:262144}).promise;
    if(my!==P.seq){ doc.destroy(); return; }
    P.doc=doc; const p1=await doc.getPage(1), v=p1.getViewport({scale:1}); P.ratio=v.height/v.width;
    pdfBuild(); $('#pdfTot').textContent=doc.numPages;
    const pos=restore?(+lsGet('pos:'+a.id)||0):0;
    if(restore&&pos) [0,300,900].forEach(ms=>setTimeout(()=>{ if(cur&&cur.id===a.id&&Math.abs(scrollY-pos)>8) window.scrollTo(0,pos); },ms)); else if(!keep) window.scrollTo({top:0});
  }catch(e){ if(my!==P.seq) return; console.warn(e); const r=$('#reader'); if(r) r.innerHTML=`<div class="alert alert-warning small mb-0">${esc(pdfErr(e))}</div>`; }
}
function pdfLabels(){ document.querySelectorAll('#pdfWrap [data-i18n-title]').forEach(n=>n.title=t(n.dataset.i18nTitle)); document.querySelectorAll('#pdfWrap [data-i18n]').forEach(n=>n.textContent=t(n.dataset.i18n)); }
function pdfTeardown(){
  if(P.saveT){ clearTimeout(P.saveT); P.saveT=0; if(isPdf()) pdfSave(); }
  P.seq++; if(P.obs){ P.obs.disconnect(); P.obs=null; } if(P.doc){ try{ P.doc.destroy(); }catch(e){} P.doc=null; }
  P.id=null; P.addMode=false; document.body.classList.remove('pdf-adding'); pdfFabKill();
}

/* ---------- Dựng trang (chỉ vẽ trang đang xem) ---------- */
const pdfPageW=()=>Math.max(220,Math.min(($('#reader').clientWidth||800)-6,1000))*P.zoom;
const pageEl=n=>$(`#pdfPages .pdf-page[data-n="${n}"]`);
function pdfBuild(){
  const r=$('#reader'); r.innerHTML='<div class="pdf-pages" id="pdfPages"></div>'; const box=$('#pdfPages'), w=pdfPageW(), fr=document.createDocumentFragment();
  for(let n=1;n<=P.doc.numPages;n++){ const d=pdfDiv('pdf-page'); d.dataset.n=n; d.style.width=w+'px'; d.style.height=(w*(P.ratios[n]||P.ratio))+'px'; fr.appendChild(d); }
  box.appendChild(fr);
  P.obs=new IntersectionObserver(es=>es.forEach(en=>{ const el=en.target; el._want=en.isIntersecting; if(en.isIntersecting) renderPage(+el.dataset.n); else unrenderPage(el); }),{rootMargin:'1200px 0px'});
  box.querySelectorAll('.pdf-page').forEach(el=>P.obs.observe(el));
}
function unrenderPage(el){ el._gen=(el._gen||0)+1; el._want=false; el._done=false; if(el._task){ try{ el._task.cancel(); }catch(e){} el._task=null; } el.classList.remove('on'); el.innerHTML=''; }
async function renderPage(n){
  const el=pageEl(n); if(!el||el._busy||el._done||!P.doc) return;
  el._busy=true; const gen=el._gen=(el._gen||0)+1, seq=P.seq, doc=P.doc;
  try{
    const page=await doc.getPage(n); if(seq!==P.seq||gen!==el._gen) return;
    const w=pdfPageW(), scale=w/page.getViewport({scale:1}).width, vp=page.getViewport({scale});
    P.ratios[n]=vp.height/vp.width; el.style.width=vp.width+'px'; el.style.height=vp.height+'px'; el.innerHTML='';
    let q=Math.min(window.devicePixelRatio||1,2); const area=vp.width*vp.height; if(area*q*q>12e6) q=Math.sqrt(12e6/area);
    const cv=document.createElement('canvas'); cv.width=Math.floor(vp.width*q); cv.height=Math.floor(vp.height*q); cv.style.width=vp.width+'px'; cv.style.height=vp.height+'px'; el.appendChild(cv);
    const hl=pdfDiv('pdf-hlayer'), tl=pdfDiv('textLayer'), tx=pdfDiv('pdf-txlayer');
    tl.style.width=vp.width+'px'; tl.style.height=vp.height+'px'; tl.style.setProperty('--scale-factor',scale);
    el.append(hl,tl,tx);
    const task=page.render({canvasContext:cv.getContext('2d'),viewport:page.getViewport({scale:scale*q})}); el._task=task; await task.promise; el._task=null;
    if(seq!==P.seq||gen!==el._gen) return;
    const src=page.streamTextContent();
    if(window.pdfjsLib.renderTextLayer) await pdfjsLib.renderTextLayer({textContentSource:src,container:tl,viewport:vp,textDivs:[]}).promise;
    else if(pdfjsLib.TextLayer) await new pdfjsLib.TextLayer({textContentSource:src,container:tl,viewport:vp}).render();
    if(seq!==P.seq||gen!==el._gen) return;
    pdfOverlays(n,el); el.classList.add('on'); el._done=true;
  }catch(e){ if(!(e&&e.name==='RenderingCancelledException')) console.warn('pdf page',n,e); }
  finally{ el._busy=false; if(el._want&&!el._done&&gen===el._gen) renderPage(n); else if(el._want&&!el._done) renderPage(n); }
}
function pdfOverlays(n,el){
  const hl=el.querySelector('.pdf-hlayer'), tx=el.querySelector('.pdf-txlayer');
  P.hl.filter(h=>h.p===n).forEach(h=>hl.appendChild(hlEl(h)));
  P.tx.filter(x=>x.p===n).forEach(x=>tx.appendChild(txEl(x,el)));
}

/* ---------- Thanh công cụ: zoom, trang ---------- */
function pdfZoomLabel(){ const v=$('#pdfZv'); if(v) v.textContent=Math.round(P.zoom*100)+'%'; }
function pdfSetZoom(z){
  z=Math.round(Math.min(3,Math.max(.5,z))*100)/100; if(z===P.zoom||!P.doc) return; hideAll();
  const pages=[...document.querySelectorAll('#pdfPages .pdf-page')], a=pages.find(p=>p.getBoundingClientRect().bottom>80), rc=a&&a.getBoundingClientRect(), fr=a?(80-rc.top)/rc.height:0;
  P.zoom=z; try{ localStorage.setItem('pdfz',z); }catch(e){} pdfZoomLabel(); pdfRelayout(); 
  if(a){ const r2=a.getBoundingClientRect(); window.scrollBy(0,r2.top+fr*r2.height-80); }
}
function pdfRelayout(){
  const w=pdfPageW(); document.querySelectorAll('#pdfPages .pdf-page').forEach(el=>{ unrenderPage(el); el.style.width=w+'px'; el.style.height=(w*(P.ratios[+el.dataset.n]||P.ratio))+'px'; if(P.obs){ P.obs.unobserve(el); P.obs.observe(el); } });
}
function pdfCurPage(){ let best=1; const mid=innerHeight*.4; for(const p of document.querySelectorAll('#pdfPages .pdf-page')){ const r=p.getBoundingClientRect(); if(r.top<=mid) best=+p.dataset.n; if(r.top>mid) break; } return best; }
let pgT=0; addEventListener('scroll',()=>{ if(!P.doc) return; cancelAnimationFrame(pgT); pgT=requestAnimationFrame(()=>{ const i=$('#pdfPg'); if(i&&document.activeElement!==i) i.value=pdfCurPage(); }); },{passive:true});
let rzT=0; addEventListener('resize',()=>{ if(!P.doc) return; clearTimeout(rzT); rzT=setTimeout(()=>{ const w=pdfPageW(), p=document.querySelector('#pdfPages .pdf-page'); if(p&&Math.abs(parseFloat(p.style.width)-w)>20) pdfRelayout(); },250); });
function pdfWire(){
  $('#pdfBack').onclick=showTools;
  $('#pdfZo').onclick=()=>pdfSetZoom(P.zoom-.15); $('#pdfZi').onclick=()=>pdfSetZoom(P.zoom+.15);
  $('#pdfFit').onclick=()=>pdfSetZoom(1); $('#pdfZv').onclick=()=>pdfSetZoom(1);
  $('#pdfPg').onchange=e=>{ const n=Math.min(P.doc?P.doc.numPages:1,Math.max(1,parseInt(e.target.value)||1)), el=pageEl(n); if(el) window.scrollTo({top:el.getBoundingClientRect().top+scrollY-70}); e.target.blur(); };
  $('#pdfPg').onfocus=e=>e.target.select();
  $('#pdfAdd').onclick=()=>pdfAddMode(!P.addMode);
  $('#pdfDl').onclick=async()=>{ const {data,error}=await sb.storage.from(PDF_BUCKET).createSignedUrl(cur.url.slice(4),120,{download:(cur.title||'file')+'.pdf'}); if(error) return alert(pdfErr(error)); const a=document.createElement('a'); a.href=data.signedUrl; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove(); };
}
function pdfAddMode(on){
  P.addMode=on; document.body.classList.toggle('pdf-adding',on);
  const b=$('#pdfAdd'); if(b){ b.classList.toggle('btn-primary',on); b.classList.toggle('btn-outline-primary',!on); }
  const f=$('#pdfFab'); if(f) f.classList.toggle('on',on);
  if(on) hideAll();
}
/* Khi thanh công cụ trượt khỏi màn hình → hiện nút tròn "Thêm chữ" nổi ở góc */
function pdfFabMake(){
  pdfFabKill();
  const f=document.createElement('button'); f.id='pdfFab'; f.className='pdf-fab'; f.title=t('pdfAddText'); f.setAttribute('aria-label',t('pdfAddText'));
  f.innerHTML='<i class="bi bi-fonts"></i>'; f.onclick=()=>pdfAddMode(!P.addMode); document.body.appendChild(f);
  const src=$('#pdfAdd'); if(src&&window.IntersectionObserver){ P.fabObs=new IntersectionObserver(es=>f.classList.toggle('show',!es[0].isIntersecting),{rootMargin:'-64px 0px 0px 0px'}); P.fabObs.observe(src); }
}
function pdfFabKill(){ if(P.fabObs){ P.fabObs.disconnect(); P.fabObs=null; } const f=$('#pdfFab'); if(f) f.remove(); }
document.addEventListener('keydown',e=>{ if(e.key==='Escape'&&P.addMode) pdfAddMode(false); });

/* ---------- Highlight (dùng lại bảng màu / tra từ / ghi chú của web) ---------- */
function hlEl(h){
  const m=document.createElement('mark'); m.className='pdf-hl'+((cur.notes[h.id]||'').trim()?' has-note':''); m.dataset.id=h.id; m.dataset.c=h.c; m.dataset.p=h.p;
  m.innerHTML=h.r.map(r=>`<i style="left:${r[0]*100}%;top:${r[1]*100}%;width:${r[2]*100}%;height:${r[3]*100}%"></i>`).join('')+'<b hidden></b>';
  m.querySelector('b').textContent=h.t||''; return m;
}
const rectIn=(s,r,e=.0015)=>s[0]<=r[0]+e&&s[1]<=r[1]+e&&s[0]+s[2]>=r[0]+r[2]-e&&s[1]+s[3]>=r[1]+r[3]-e;
function mergeRects(a){
  a=a.filter((r,i)=>!a.some((s,j)=>j!==i&&rectIn(s,r)&&(!rectIn(r,s)||j<i)));
  let ch=true; while(ch){ ch=false;
    outer: for(let i=0;i<a.length;i++) for(let j=i+1;j<a.length;j++){ const l=a[i], r=a[j], h=Math.max(l[3],r[3]);
      if(Math.abs((l[1]+l[3]/2)-(r[1]+r[3]/2))<h*.4&&Math.abs(l[3]-r[3])<h*.6&&r[0]<=l[0]+l[2]+h*.8&&l[0]<=r[0]+r[2]+h*.8){
        const x1=Math.min(l[0],r[0]), x2=Math.max(l[0]+l[2],r[0]+r[2]), y1=Math.min(l[1],r[1]), y2=Math.max(l[1]+l[3],r[1]+r[3]);
        a[i]=[x1,y1,x2-x1,y2-y1]; a.splice(j,1); ch=true; break outer; } }
  }
  return a.sort((p,q)=>p[1]-q[1]||p[0]-q[0]);
}
function rangeRects(range){
  const out=new Map(), pages=[...document.querySelectorAll('#pdfPages .pdf-page.on')].map(p=>[+p.dataset.n,p.getBoundingClientRect()]);
  [...range.getClientRects()].filter(r=>r.width>1&&r.height>1).forEach(r=>{
    const cx=r.left+r.width/2, cy=r.top+r.height/2, pg=pages.find(([n,b])=>cx>=b.left&&cx<=b.right&&cy>=b.top&&cy<=b.bottom); if(!pg) return;
    const b=pg[1], x=Math.max(0,(r.left-b.left)/b.width), y=Math.max(0,(r.top-b.top)/b.height), w=Math.min(1-x,r.width/b.width), h=Math.min(1-y,r.height/b.height);
    if(!out.has(pg[0])) out.set(pg[0],[]); out.get(pg[0]).push([x,y,w,h]);
  });
  return [...out].map(([n,a])=>[n,mergeRects(a)]).sort((p,q)=>p[0]-q[0]);
}
const _createMark=createMark;
createMark=async function(c,range){
  if(!isPdf()) return _createMark(c,range);
  const groups=rangeRects(range), txt=range.toString().replace(/\s+/g,' ').trim(), base=Date.now(); let first=null;
  groups.forEach(([n,r],i)=>{
    const h={id:'h'+base.toString(36)+i,p:n,c,r,t:i===0?txt:''}; P.hl.push(h); cur.notes[h.id]='';
    const el=pageEl(n), lay=el&&el.querySelector('.pdf-hlayer'), m=hlEl(h); if(lay) lay.appendChild(m); if(!first) first=m;
  });
  getSelection().removeAllRanges(); savedRange=null;
  if(!first){ first=document.createElement('mark'); first.dataset.id='h'+base.toString(36); first.dataset.c=c; cur.notes[first.dataset.id]=''; }
  return first;
};
const _rectsOf=rectsOf;
rectsOf=function(x){
  if(x&&x.classList&&x.classList.contains('pdf-hl')){ const a=[...x.querySelectorAll('i')].map(i=>i.getBoundingClientRect()).filter(r=>r.width>0); return a.length?a:[x.getBoundingClientRect()]; }
  return _rectsOf(x);
};
function hitMark(pg,x,y){
  for(const m of pg.querySelectorAll('.pdf-hlayer mark.pdf-hl')) for(const i of m.querySelectorAll('i')){ const r=i.getBoundingClientRect(); if(x>=r.left-1&&x<=r.right+1&&y>=r.top-1&&y<=r.bottom+1) return m; }
  return null;
}
document.addEventListener('click',e=>{
  if(!isPdf()||P.addMode||e.target.closest('#hlMenu,#editor,.pdf-tx')||!getSelection().isCollapsed) return;
  const pg=e.target.closest('.pdf-page'); if(!pg) return; const m=hitMark(pg,e.clientX,e.clientY); if(m) openMenu(()=>rectsOf(m),m);
});
let tipT=0;
document.addEventListener('mousemove',e=>{
  if(!isPdf()||!canHover) return; const now=Date.now(); if(now-tipT<60) return; tipT=now;
  const tp=$('#tip'), pg=e.target.closest&&e.target.closest('.pdf-page'), m=pg&&!e.target.closest('.pdf-tx')?hitMark(pg,e.clientX,e.clientY):null;
  if(!m||$('#hlMenu').classList.contains('on')||$('#editor').classList.contains('on')){ if(!m&&tp.classList.contains('on')) hidePop(tp); return; }
  const n=cur.notes[m.dataset.id]; if(!n){ hidePop(tp); return; } tp.textContent=n; place(tp,()=>rectsOf(m),'above'); tp.classList.add('on');
});
/* Gỡ 1 / tất cả highlight */
function pdfRemoveHl(id){ P.hl=P.hl.filter(h=>h.id!==id); delete cur.notes[id]; document.querySelectorAll(`#reader mark.pdf-hl[data-id="${id}"]`).forEach(m=>m.remove()); }
const _actRem=$('#actRem').onclick;
$('#actRem').onclick=async function(ev){ if(!isPdf()) return _actRem.call(this,ev); const m=menuMark; hideMenu(); if(!m) return; pdfRemoveHl(m.dataset.id); await saveArticle(); };
const _actAll=$('#actAll').onclick;
$('#actAll').onclick=async function(ev){ if(!isPdf()) return _actAll.call(this,ev); hideMenu(); if(!await ask(t('clearQ'),t('delOk'))) return; P.hl.slice().forEach(h=>pdfRemoveHl(h.id)); await saveArticle(); };
/* Bôi chữ trong ô chữ thì không bật bảng highlight */
const _syncSel=syncSel;
syncSel=function(){ const a=document.activeElement; if(a&&a.closest&&a.closest('.pdf-tx')) return; return _syncSel(); };

/* ---------- Ô chữ thêm lên PDF ---------- */
function txEl(x,page){
  const pw=page.offsetWidth||parseFloat(page.style.width)||800, box=pdfDiv('pdf-tx'+(x.y<.07?' top':'')); box.dataset.id=x.id;
  box.style.left=(x.x*100)+'%'; box.style.top=(x.y*100)+'%';
  const body=pdfDiv('pdf-tx-t'); body.contentEditable='true'; body.spellcheck=false; body.style.fontSize=(x.s*pw)+'px'; body.style.color=x.c; body.textContent=x.t||''; body.dataset.ph=t('pdfNewText');
  const bar=pdfDiv('pdf-tx-bar'); bar.contentEditable='false';
  bar.innerHTML=`<button class="pdf-drag" title="${t('pdfMove')}"><i class="bi bi-arrows-move"></i></button><button data-k="dn" title="${t('pdfSmaller')}">A−</button><button data-k="up" title="${t('pdfBigger')}">A+</button><button data-k="col" title="${t('pdfColor')}"><i class="bi bi-circle-fill" style="color:${x.c}"></i></button><button data-k="del" title="${t('pdfDelTx')}"><i class="bi bi-trash"></i></button>`;
  box.append(bar,body);
  const find=()=>P.tx.find(z=>z.id===x.id);
  body.addEventListener('input',()=>{ const o=find(); if(o){ o.t=body.innerText.replace(/\n$/,''); pdfSaveSoon(); } });
  body.addEventListener('paste',e=>{ e.preventDefault(); document.execCommand('insertText',false,(e.clipboardData||window.clipboardData).getData('text')); });
  body.addEventListener('blur',()=>{ const o=find(); if(o&&!(o.t||'').trim()){ txRemove(x.id); } else pdfSaveSoon(); });
  bar.addEventListener('mousedown',e=>{ if(!e.target.closest('.pdf-drag')) e.preventDefault(); });
  bar.addEventListener('click',e=>{
    const b=e.target.closest('[data-k]'); if(!b) return; const o=find(); if(!o) return;
    if(b.dataset.k==='del') return txRemove(x.id);
    if(b.dataset.k==='up'||b.dataset.k==='dn'){ o.s=Math.min(.12,Math.max(.006,o.s*(b.dataset.k==='up'?1.12:1/1.12))); body.style.fontSize=(o.s*(page.offsetWidth||pw))+'px'; }
    if(b.dataset.k==='col'){ o.c=TX_COLORS[(TX_COLORS.indexOf(o.c)+1)%TX_COLORS.length]; body.style.color=o.c; b.querySelector('i').style.color=o.c; }
    pdfSaveSoon();
  });
  const drag=bar.querySelector('.pdf-drag');
  drag.addEventListener('pointerdown',e=>{
    const o=find(); if(!o) return; e.preventDefault(); drag.setPointerCapture(e.pointerId);
    const pb=page.getBoundingClientRect(), sx=e.clientX, sy=e.clientY, ox=o.x, oy=o.y;
    const mv=ev=>{ o.x=Math.min(.98,Math.max(0,ox+(ev.clientX-sx)/pb.width)); o.y=Math.min(.98,Math.max(0,oy+(ev.clientY-sy)/pb.height)); box.style.left=(o.x*100)+'%'; box.style.top=(o.y*100)+'%'; box.classList.toggle('top',o.y<.07); };
    const up=()=>{ drag.removeEventListener('pointermove',mv); drag.removeEventListener('pointerup',up); drag.removeEventListener('pointercancel',up); pdfSaveSoon(); };
    drag.addEventListener('pointermove',mv); drag.addEventListener('pointerup',up); drag.addEventListener('pointercancel',up);
  });
  return box;
}
function txRemove(id){ P.tx=P.tx.filter(z=>z.id!==id); document.querySelectorAll(`.pdf-tx[data-id="${id}"]`).forEach(n=>n.remove()); pdfSaveSoon(); }
/* Bấm lên trang (khi đang ở chế độ "Thêm chữ") để đặt ô chữ */
document.addEventListener('pointerdown',e=>{
  if(!isPdf()||!P.addMode) return; const lay=e.target.classList&&e.target.classList.contains('pdf-txlayer')?e.target:null; if(!lay) return;
  e.preventDefault(); const page=lay.parentElement, b=page.getBoundingClientRect(), n=+page.dataset.n;
  const x={id:'t'+Date.now().toString(36),p:n,x:Math.min(.9,(e.clientX-b.left)/b.width),y:Math.min(.97,Math.max(0,(e.clientY-b.top-11)/b.height)),s:Math.max(.008,Math.min(.05,16/b.width*(1/P.zoom)*P.zoom)),c:TX_COLORS[0],t:''};
  P.tx.push(x); const el=txEl(x,page); lay.appendChild(el); setTimeout(()=>el.querySelector('.pdf-tx-t').focus(),0);
},true);

/* ---------- Lưu ---------- */
function pdfSerialize(){
  P.hl.forEach(h=>{ const m=document.querySelector(`#reader mark.pdf-hl[data-id="${h.id}"]`); if(m) h.c=m.dataset.c; });
  const keep=new Set(P.hl.map(h=>h.id)); Object.keys(cur.notes).forEach(k=>{ if(k!=='__pdf'&&!keep.has(k)) delete cur.notes[k]; });
  const f=v=>+v.toFixed(5);
  cur.notes.__pdf={hl:P.hl.map(h=>({id:h.id,p:h.p,c:h.c,r:h.r.map(r=>r.map(f)),t:h.t||''})),tx:P.tx.filter(x=>(x.t||'').trim()).map(x=>({id:x.id,p:x.p,x:f(x.x),y:f(x.y),s:f(x.s),c:x.c,t:x.t}))};
}
async function pdfSave(){ if(!cur) return; pdfSerialize(); const {error}=await sb.from('articles').update({notes:cur.notes}).eq('id',cur.id); if(error) alert(t('saveFail')+error.message); }
function pdfSaveSoon(){ clearTimeout(P.saveT); P.saveT=setTimeout(()=>{ P.saveT=0; if(isPdf()) pdfSave(); },700); }
const _saveArticle=saveArticle;
saveArticle=async function(){ if(isPdf()) return pdfSave(); return _saveArticle(); };
