/* =====================================================================
   Dịch toàn bộ bài báo sang tiếng Việt (popup), chuẩn thuật ngữ Logistics / Supply chain
   - Cách 1 (chính xác nhất): Supabase Edge Function "translate" gọi Claude + bảng thuật ngữ (xem README).
   - Cách 2 (tự dùng khi chưa bật cách 1): dịch máy nhanh + thay sẵn thuật ngữ theo js/glossary.js (độ chính xác thấp hơn).
   - Tùy chọn "Kèm thuật ngữ gốc": thuật ngữ chuyên ngành viết dạng  "vận đơn (bill of lading)".
   ===================================================================== */
const TR_CHUNK=4500;          /* số ký tự tối đa mỗi lần gửi cho Claude */
let trRun=0, trEngine=null;   /* trEngine: 'claude' | 'mt' (nhớ trong phiên để khỏi thử lại Edge Function) */

/* ---------- Thuật ngữ ---------- */
const trNorm=s=>s.toLowerCase().replace(/[\s-]+/g,' ').trim();
const TR_MAP=new Map(GLOSSARY.map(([en,vi])=>[trNorm(en),{en,vi}]));
const TR_RE=new RegExp('(?<![\\p{L}\\p{N}])(?:'+[...GLOSSARY].sort((a,b)=>b[0].length-a[0].length)
  .map(([en])=>en.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/ /g,'[\\s-]+')).join('|')+')(?:s|es)?(?![\\p{L}\\p{N}])','giu');
function trLookup(m){ const k=trNorm(m); return TR_MAP.get(k)||TR_MAP.get(k.replace(/es$/,''))||TR_MAP.get(k.replace(/s$/,''))||null; }
function trTermsIn(texts){ const f=new Map(); texts.join('\n').replace(TR_RE,m=>{ const g=trLookup(m); if(g) f.set(g.en,g); return m; }); return [...f.values()].filter(g=>trNorm(g.en)!==trNorm(g.vi)).map(g=>[g.en,g.vi]); }

/* ---------- Lấy các đoạn của bài ---------- */
function trCollect(){
  const root=$('#reader'); if(!root) return [];
  const SEL='h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th', out=[];
  root.querySelectorAll(SEL).forEach(el=>{
    if(el.querySelector(SEL)) return;                       /* chỉ lấy phần tử ngoài cùng của chữ */
    const text=el.textContent.replace(/\s+/g,' ').trim();
    if(text.length<2||!/\p{L}/u.test(text)) return;
    out.push({tag:/^h\d$/i.test(el.tagName)?'h':el.tagName.toLowerCase()==='li'?'li':'p',text});
  });
  if(!out.length) root.textContent.split(/\n{2,}/).map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean).forEach(text=>out.push({tag:'p',text}));
  return out;
}
const trLooksVi=txt=>{ const v=(txt.match(/[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/gi)||[]).length; return v/Math.max(1,txt.length)>.035; };

/* ---------- Cách 1: Claude qua Edge Function ---------- */
async function trClaude(texts,keep,title){
  const { data, error } = await sb.functions.invoke('translate',{ body:{ paragraphs:texts, glossary:trTermsIn(texts), keep, title } });
  if(error) throw error;
  if(!data||!Array.isArray(data.translations)||data.translations.length!==texts.length) throw new Error('bad response');
  return data.translations;
}

/* ---------- Cách 2: dịch máy + thay sẵn thuật ngữ ---------- */
function trSplit(s,max=1200){ if(s.length<=max) return [s]; const parts=s.match(/[^.!?]+[.!?]*\s*/g)||[s], out=[]; let c=''; parts.forEach(p=>{ if((c+p).length>max&&c){ out.push(c); c=''; } c+=p; }); if(c) out.push(c); return out; }
async function trMT1(text,keep){
  const used=[]; const pre=text.replace(TR_RE,m=>{ const g=trLookup(m); if(!g) return m; used.push(g); return g.vi; });
  let out=''; for(const piece of trSplit(pre)){ const r=await gtranslate(piece,'vi'); if(!r) throw new Error('mt'); out+=r+' '; }
  out=out.trim();
  if(keep){ const done=new Set(); used.forEach(g=>{ if(done.has(g.en)||/\)\s*$/.test(g.vi)) return; done.add(g.en); const i=out.toLowerCase().indexOf(g.vi.toLowerCase()); if(i>=0){ const e=i+g.vi.length; out=out.slice(0,e)+' ('+g.en+')'+out.slice(e); } }); }
  return out;
}

/* ---------- Dịch theo từng cụm, hiện dần trong popup ---------- */
function trChunks(items){ const ch=[]; let cur=[],n=0; items.forEach((it,i)=>{ if(n+it.text.length>TR_CHUNK&&cur.length){ ch.push(cur); cur=[]; n=0; } cur.push(i); n+=it.text.length; }); if(cur.length) ch.push(cur); return ch; }
const trKey=(id,keep)=>'tr2:'+id+':'+(keep?1:0);
function trCacheGet(id,keep){ try{ return JSON.parse(localStorage.getItem(trKey(id,keep))||'null'); }catch(e){ return null; } }
function trCacheSet(id,keep,v){ try{ localStorage.setItem(trKey(id,keep),JSON.stringify(v)); }catch(e){ /* đầy bộ nhớ thì bỏ qua */ } }

function trRender(items,res,eng,done){
  const body=$('#trBody'); if(!body) return;
  const sig=cur.id+':'+items.length;
  if(body.dataset.sig!==sig||!body.querySelector('[data-i]')){            /* dựng khung 1 lần (có hiệu ứng xuất hiện lần lượt) */
    body.dataset.sig=sig;
    body.innerHTML=items.map((it,i)=>{ const k=it.tag==='t'?'tr-t':it.tag==='h'?'tr-h':it.tag==='li'?'tr-li':'tr-p', tg=it.tag==='t'?'h5':it.tag==='h'?'h6':'div';
      return `<${tg} class="tr-x ${k} tr-sk" data-i="${i}" style="--i:${Math.min(i,16)}"><span class="c">&nbsp;</span></${tg}>`; }).join('');
  }
  items.forEach((it,i)=>{ const el=body.querySelector(`[data-i="${i}"]`), v=res[i]; if(!el||!v||el.dataset.f==='1') return;
    el.dataset.f='1'; el.classList.remove('tr-sk'); el.classList.add('tr-fresh'); el.querySelector('.c').textContent=(it.tag==='li'?'• ':'')+v; });
  const bd=$('#trEng'); if(bd){ bd.style.display=eng?'':'none'; bd.className='badge '+(eng==='claude'?'text-bg-success':'text-bg-secondary'); bd.textContent=eng==='claude'?t('trEngClaude'):t('trEngMT'); }
}
async function trStart(force){
  if(!cur) return; const my=++trRun, keep=false, body0=trCollect(), items=body0.length?[...(cur.title?[{tag:'t',text:cur.title}]:[]),...body0]:[]; if(force){ const bb=$('#trBody'); if(bb) bb.dataset.sig=''; }
  if(!items.length){ $('#trBody').innerHTML=`<div class="text-muted">${t('trEmpty')}</div>`; return; }
  if(trLooksVi(items.map(i=>i.text).join(' ').slice(0,4000))){ $('#trBody').innerHTML=`<div class="text-muted">${t('trAlreadyVi')}</div>`; return; }
  const hit=!force&&trCacheGet(cur.id,keep);
  if(hit&&hit.res&&hit.res.length===items.length){ trRender(items,hit.res,hit.eng,true); $('#trProg').style.display='none'; return; }
  const res=new Array(items.length).fill(''), chunks=trChunks(items), prog=$('#trProg'), bar=prog.firstElementChild;
  prog.style.display=''; bar.style.width='0%'; let eng=trEngine, failed=false;
  trRender(items,res,eng,false); $('#trCopy').disabled=true; $('#trRe').disabled=true;
  try{
    for(let k=0;k<chunks.length;k++){
      if(my!==trRun) return;
      const idx=chunks[k], texts=idx.map(i=>items[i].text); let out=null;
      if(trEngine!=='mt'){ try{ out=await trClaude(texts,keep,cur.title); eng=trEngine='claude'; }catch(e){ if(trEngine!=='claude'||k===0){ trEngine='mt'; } eng='mt'; } }
      if(!out){ eng='mt'; out=[]; for(const tx of texts){ if(my!==trRun) return; try{ out.push(await trMT1(tx,keep)); }catch(e){ out.push(tx); failed=true; } } }
      idx.forEach((i,j)=>res[i]=out[j]); bar.style.width=Math.round((k+1)/chunks.length*100)+'%'; trRender(items,res,eng,false);
    }
    if(my!==trRun) return;
    if(!failed) trCacheSet(cur.id,keep,{eng,res});
    trRender(items,res,eng,true);
  }finally{ if(my===trRun){ prog.style.display='none'; $('#trCopy').disabled=false; $('#trRe').disabled=false; } }
}
function trOpen(){
  if(!cur||isPdfRow(cur)) return;
  $('#trTitle').textContent=cur.title;
  $('#trBody').dataset.sig=''; $('#trBody').innerHTML=`<div class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>${t('trWait')}</div>`;
  $('#trEng').style.display='none';
  bootstrap.Modal.getOrCreateInstance($('#trModal')).show(); trStart(false);
}
document.addEventListener('click',e=>{
  if(e.target.closest('#trBtn')) trOpen();
  if(e.target.closest('#trRe')) trStart(true);
  if(e.target.closest('#trCopy')){ const txt=[...document.querySelectorAll('#trBody .tr-t,#trBody .tr-h,#trBody .tr-li,#trBody .tr-p')].map(n=>n.textContent).join('\n\n'); (navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(()=>toast(t('copied')),()=>{}); }
});
document.addEventListener('hidden.bs.modal',e=>{ if(e.target.id==='trModal') trRun++; });   /* đóng popup → dừng dịch */

/* ---------- Thêm nút "Dịch bài" vào thanh công cụ của bài báo ---------- */
(()=>{
  const _oa=openArticle;
  openArticle=function(a){
    const r=_oa.apply(this,arguments);
    if(!isPdfRow(a)){ const sg=$('#sgBtn'); if(sg&&!$('#trBtn')){ const b=document.createElement('button'); b.className='btn btn-sm btn-outline-primary'; b.id='trBtn'; b.type='button'; b.innerHTML=`<i class="bi bi-translate me-1"></i><span class="d-none d-sm-inline">${t('trBtn')}</span>`; b.title=t('trBtn'); sg.before(b); } }
    return r;
  };
})();
/* đổi ngôn ngữ giao diện khi popup đang mở → cập nhật nhãn (nội dung dịch giữ nguyên) */
