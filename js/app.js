const sb = supabase.createClient('https://vjvvyadldyvqtjjsscfm.supabase.co','sb_publishable_0-6FZl4pVfLQJ_Cvclo7mw_SruO5EDj');
const $ = s => document.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COLORS=['yellow','green','blue','pink','orange','purple'];
const isPdfRow=a=>!!a&&typeof a.url==='string'&&a.url.startsWith('pdf:');   /* file PDF lưu trong bảng articles với url dạng pdf:<đường dẫn> */
let user, articles=[], pdfs=[], folders=[], cur=null, view='all', mode='login', editId=null, menuMark=null, savedRange=null, lang='vi';
try{ lang=localStorage.getItem('lang')||(navigator.language||'').startsWith('vi')?'vi':'en'; if(localStorage.getItem('lang')) lang=localStorage.getItem('lang'); }catch(e){}

const flag = l => l==='vi' ? '<svg viewBox="0 0 30 20" width="22" height="15"><use href="#f-vi"/></svg>' : '<svg viewBox="0 0 60 30" width="24" height="12"><use href="#f-en"/></svg>';
const toolsHTML = () => `<div class="btn-group btn-group-sm">${['vi','en'].map(l=>`<button class="btn btn-outline-secondary lbtn" data-lang="${l}" title="${l=='vi'?'Tiếng Việt':'English'}">${flag(l)}</button>`).join('')}</div><button class="btn btn-sm btn-outline-secondary themeBtn"><i class="bi"></i></button>`;
document.querySelectorAll('.tools-slot').forEach(s=>s.innerHTML=toolsHTML());
function applyLang(){
  document.documentElement.lang=lang;
  document.querySelectorAll('[data-i18n]').forEach(n=>n.textContent=t(n.dataset.i18n));
  document.querySelectorAll('[data-ph]').forEach(n=>n.placeholder=t(n.dataset.ph));
  document.querySelectorAll('[data-i18n-title]').forEach(n=>n.title=t(n.dataset.i18nTitle));
  $('#authBtn').textContent=t(mode);
  document.querySelectorAll('.lbtn').forEach(b=>b.classList.toggle('active',b.dataset.lang===lang));
  if(user){ renderSide(); if(cur) openArticle(cur,true); else showEmpty(); }
}
function applyTheme(){ const d=document.documentElement.dataset.bsTheme==='dark'; document.querySelectorAll('.themeBtn i').forEach(i=>i.className='bi '+(d?'bi-sun':'bi-moon-stars')); }
document.addEventListener('click',e=>{
  const l=e.target.closest('[data-lang]'); if(l){ lang=l.dataset.lang; try{localStorage.setItem('lang',lang)}catch(_){} applyLang(); }
  const th=e.target.closest('.themeBtn'); if(th){ const n=document.documentElement.dataset.bsTheme==='dark'?'light':'dark'; const h=document.documentElement; h.classList.add('tt'); h.dataset.bsTheme=n; setTimeout(()=>h.classList.remove('tt'),450); try{localStorage.setItem('theme',n)}catch(_){} applyTheme(); }
  const b=e.target.closest('.eye'); if(b){ const i=b.parentElement.querySelector('input'), s=i.type==='password'; i.type=s?'text':'password'; b.innerHTML=`<i class="bi bi-eye${s?'-slash':''}"></i>`; }
});
const cfEl=()=>document.getElementById('cfModal');
function ask(msg,okText,danger=true){return new Promise(res=>{
  $('#cfMsg').textContent=msg; const ok=$('#cfOk'),el=cfEl(),m=bootstrap.Modal.getOrCreateInstance(el); let done=false;
  ok.textContent=okText; ok.className='btn '+(danger?'btn-danger':'btn-primary');
  $('#cfIcon').className='bi fs-1 '+(danger?'bi-exclamation-triangle text-danger':'bi-folder-symlink text-primary');
  const fin=v=>{ if(done) return; done=true; el.removeEventListener('hidden.bs.modal',onHide); res(v); };
  const onHide=()=>fin(false);
  ok.onclick=()=>{ fin(true); m.hide(); }; el.addEventListener('hidden.bs.modal',onHide); m.show(); });}
function toast(msg){ $('#toastMsg').textContent=msg; bootstrap.Toast.getOrCreateInstance($('#toastEl'),{delay:2600}).show(); }
function closeSide(){ if(innerWidth<992){ const o=bootstrap.Offcanvas.getInstance($('#sideCanvas')); if(o) o.hide(); } }
const loader = on => $('#loader').classList.toggle('hide', !on);
const alertBox = (el,msg,type='danger') => $(el).innerHTML = msg ? `<div class="alert alert-${type} py-2 small">${msg}</div>` : '';
const loc = () => lang==='vi'?'vi-VN':'en-GB';
function showEmpty(keep){
  $('#readerBox').innerHTML=`<div class="reader-card vfade text-center text-muted py-5"><i class="bi bi-book fs-1 text-danger"></i><p class="mt-2 mb-0">${t('emptyMain')}</p></div><div id="homeFeed" class="mt-3"></div>`;
  document.title='Readup Support News';
  if(!keep){ cur=null; try{ history.replaceState(null,'',location.pathname+location.search); localStorage.removeItem('last'); }catch(e){} if(user) renderHome(); }
}

/* ---------- Đăng nhập / đăng ký ---------- */
$('#authTabs').addEventListener('click', e => {
  const b=e.target.closest('[data-m]'); if(!b) return; mode=b.dataset.m;
  document.querySelectorAll('#authTabs .nav-link').forEach(x=>x.classList.toggle('active',x===b));
  $('#confWrap').style.display=mode==='signup'?'block':'none'; $('#authBtn').textContent=t(mode); alertBox('#authMsg','');
});
$('#authBtn').onclick = async () => {
  const email=$('#aEmail').value.trim(), pass=$('#aPass').value;
  if(!email||!pass) return alertBox('#authMsg',t('enterCreds'));
  if(mode==='signup'){ if(pass.length<6) return alertBox('#authMsg',t('pw6')); if(pass!==$('#aPass2').value) return alertBox('#authMsg',t('pwMis')); }
  loader(true);
  const {data,error}= mode==='signup' ? await sb.auth.signUp({email,password:pass}) : await sb.auth.signInWithPassword({email,password:pass});
  loader(false);
  if(error) return alertBox('#authMsg',error.message);
  if(mode==='signup'&&!data.session) return alertBox('#authMsg',t('confirm'),'success');
  boot(data.session);
};
['#aEmail','#aPass','#aPass2'].forEach(s=>$(s).addEventListener('keydown',e=>e.key==='Enter'&&$('#authBtn').click()));
$('#logout').onclick=async()=>{ await sb.auth.signOut(); location.reload(); };
$('#pwSave').onclick=async()=>{
  const a=$('#np1').value,b=$('#np2').value;
  if(a.length<6) return alertBox('#pwMsg',t('pw6')); if(a!==b) return alertBox('#pwMsg',t('pwMis'));
  const {error}=await sb.auth.updateUser({password:a}); if(error) return alertBox('#pwMsg',error.message);
  alertBox('#pwMsg',t('pwDone'),'success'); $('#np1').value=$('#np2').value='';
};

/* ---------- Khởi động ---------- */
async function boot(session){
  if(!session){ $('#authView').style.display='flex'; $('#appView').style.display='none'; return loader(false); }
  user=session.user; $('#uMail').textContent=user.email;
  $('#authView').style.display='none'; $('#appView').style.display='block';
  const want=(location.hash.match(/#(?:id|a)=([\w-]+)/)||[])[1];
  showEmpty(true); await loadData(); if(want) await restoreArticle(want); if(!cur) renderHome(); loader(false);
}
applyTheme(); applyLang();
async function restoreArticle(id){
  const {data}=await sb.from('articles').select('*').eq('id',id).maybeSingle();
  if(!data){ try{ localStorage.removeItem('last'); }catch(e){} return; }
  openArticle(data,false,true);
  try{ const k=JSON.parse(lsGet('lk')||'null'); if(k&&k.art===data.id&&Date.now()-k.ts<864e5) openLookup(k.text,k.mark?$(`#reader mark[data-id="${k.mark}"]`):null,k.tl); }catch(e){}
}
addEventListener('hashchange',()=>{ const id=(location.hash.match(/#(?:id|a)=([\w-]+)/)||[])[1]; if(id&&user&&(!cur||cur.id!==id)) restoreArticle(id); });
(async()=>{ const {data}=await sb.auth.getSession(); setTimeout(()=>boot(data.session),500); })();
async function loadData(){
  const [f,a]=await Promise.all([sb.from('folders').select('*').order('created_at'), sb.from('articles').select('id,title,url,folder_id,created_at,favorite').order('created_at',{ascending:false})]);
  folders=f.data||[]; let L=a; if(a.error) L=await sb.from('articles').select('id,title,url,folder_id,created_at').order('created_at',{ascending:false}); articles=L.data||[]; pdfs=articles.filter(isPdfRow); articles=articles.filter(x=>!isPdfRow(x)); renderSide();
}

/* ---------- Sidebar ---------- */
function dayLabel(d){
  const x=new Date(d),n=new Date(),y=new Date(); y.setDate(n.getDate()-1);
  if(x.toDateString()===n.toDateString()) return t('today'); if(x.toDateString()===y.toDateString()) return t('yest');
  return x.toLocaleDateString(loc());
}
function renderSide(){
  $('#navAll').classList.toggle('on',view==='all'); $('#navFav').classList.toggle('on',view==='fav');
  $('#folderList').innerHTML=folders.map(f=>`<div class="nav-item-x ${view===f.id?'on':''}" data-f="${f.id}"><i class="bi bi-folder2"></i><span>${esc(f.name)}</span><button class="x" data-del="${f.id}"><i class="bi bi-x-lg"></i></button></div>`).join('')||`<div class="small text-muted ms-1">${t('noFolders')}</div>`;
  let html='',last='';
  articles.filter(a=>view==='fav'?a.favorite:view==='all'?!a.folder_id:a.folder_id===view).forEach(a=>{ const d=dayLabel(a.created_at); if(d!==last){html+=`<div class="day">${d}</div>`;last=d;} html+=`<div class="art ${cur&&cur.id===a.id?'on':''}" data-a="${a.id}"><span class="art-t">${a.favorite?'<i class="bi bi-star-fill text-warning me-1 small"></i>':''}${esc(a.title)}</span><button class="art-more" data-m="${a.id}" aria-label="Menu"><i class="bi bi-three-dots-vertical"></i></button></div>`; });
  $('#artList').innerHTML=html||`<div class="small text-muted ms-1">${t('noArts')}</div>`;
}
$('#navAll').onclick=()=>{view='all';renderSide();};
$('#navFav').onclick=()=>{view='fav';renderSide();};
const goHome=e=>{ if(e) e.preventDefault(); showEmpty(); renderSide(); closeSide(); window.scrollTo({top:0,behavior:'smooth'}); };
$('#navHome').onclick=goHome; $('#brandHome').onclick=goHome;
$('#folderList').onclick=async e=>{
  const del=e.target.closest('[data-del]');
  if(del){ e.stopPropagation(); if(!await ask(t('delFolder'),t('delOk'))) return; await sb.from('folders').delete().eq('id',del.dataset.del); if(view===del.dataset.del) view='all'; return loadData(); }
  const f=e.target.closest('[data-f]'); if(f){ view=f.dataset.f; renderSide(); }
};
$('#addFolder').onclick=async()=>{
  const name=prompt(t('folderName')); if(!name||!name.trim()) return;
  const {error}=await sb.from('folders').insert({user_id:user.id,name:name.trim()}); if(error) return alert(error.message); loadData();
};
$('#artList').onclick=async e=>{ const mb=e.target.closest('.art-more'); if(mb){ openArtMenu(mb.dataset.m,mb); return; }
  const a=e.target.closest('[data-a]'); if(!a) return;
  loader(true); const {data}=await sb.from('articles').select('*').eq('id',a.dataset.a).single(); loader(false); if(data){ closeSide(); openArticle(data); }
};

/* ---------- Lấy bài báo ---------- */
async function getHTML(u){
  // 1) Edge Function của bạn  2) Jina Reader  3) allorigins
  try{ const {data,error}=await Promise.race([sb.functions.invoke('fetch-article',{body:{url:u}}),new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),20000))]); if(error) console.warn('edge:',error); else if(data&&data.html&&data.html.length>500) return data.html; }catch(e){ console.warn('edge:',e); }
  try{ const r=await fetch('https://r.jina.ai/'+u,{headers:{'X-Return-Format':'html'}}); if(r.ok){ const x=await r.text(); if(x.length>500) return x; } }catch(e){}
  try{ const r=await fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(u)); if(r.ok){ const x=await r.text(); if(x.length>500) return x; } }catch(e){}
  throw new Error(t('fetchFail'));
}
$('#fetchBtn').onclick=async()=>{
  const u=$('#urlIn').value.trim(); if(!/^https?:\/\//i.test(u)) return alert(t('badUrl'));
  const dup=articles.find(a=>a.url===u);
  if(dup){ loader(true); const {data:dd}=await sb.from('articles').select('*').eq('id',dup.id).single(); loader(false); if(dd){ $('#urlIn').value=''; openArticle(dd); toast(t('dupOpen')); return; } }
  loader(true);
  try{
    const html=await getHTML(u), doc=new DOMParser().parseFromString(html,'text/html');
    const base=doc.createElement('base'); base.href=u; doc.head.prepend(base);
    const art=new Readability(doc).parse(); if(!art) throw new Error(t('extractFail'));
    const box=document.createElement('div'); box.innerHTML=art.content;
    box.querySelectorAll('script,style,iframe,form,noscript').forEach(n=>n.remove());
    box.querySelectorAll('*').forEach(n=>[...n.attributes].forEach(a=>{ if(/^on/i.test(a.name)) n.removeAttribute(a.name); }));
    box.querySelectorAll('img').forEach(i=>{ i.setAttribute('referrerpolicy','no-referrer'); i.removeAttribute('srcset'); i.loading='lazy'; });
    const words=((box.textContent||'').trim().match(/\S+/g)||[]).length;
    let host=''; try{ host=new URL(u).hostname.replace(/^www\./,''); }catch(e){}
    const meta={author:(art.byline||'').trim(),site:art.siteName||host,published:art.publishedTime||'',words};
    const row={user_id:user.id,url:u,title:art.title||u,content:box.innerHTML,notes:{},folder_id:(view==='all'||view==='fav')?null:view};
    let r=await sb.from('articles').insert({...row,meta}).select().single();
    if(r.error&&/meta/i.test(r.error.message)) r=await sb.from('articles').insert(row).select().single();
    const {data,error}=r;
    if(error) throw error;
    $('#urlIn').value=''; await loadData(); openArticle(data);
  }catch(e){ alert(e.message||t('fetchFail')); }
  loader(false);
};
$('#urlIn').addEventListener('keydown',e=>e.key==='Enter'&&$('#fetchBtn').click());

/* ---------- Trình đọc ---------- */
/* ---------- Bài mới từ nguồn hay đọc (RSS) ---------- */
const FEEDS={'bbc.com':'https://feeds.bbci.co.uk/news/rss.xml','bbc.co.uk':'https://feeds.bbci.co.uk/news/rss.xml','theguardian.com':'https://www.theguardian.com/international/rss','nytimes.com':'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml','npr.org':'https://feeds.npr.org/1001/rss.xml','aljazeera.com':'https://www.aljazeera.com/xml/rss/all.xml','theconversation.com':'https://theconversation.com/global/articles.atom','cnn.com':'http://rss.cnn.com/rss/edition.rss','e.vnexpress.net':'https://e.vnexpress.net/rss/news.rss'};
async function findFeed(h){
  const k=Object.keys(FEEDS).find(x=>h===x||h.endsWith('.'+x)); if(k) return FEEDS[k];
  try{ const d=new DOMParser().parseFromString(await getHTML('https://'+h+'/'),'text/html'); const l=d.querySelector('link[rel="alternate"][type*="rss"],link[rel="alternate"][type*="atom"]'), hr=l&&l.getAttribute('href'); if(hr) return new URL(hr,'https://'+h+'/').href; }catch(e){}
  for(const p of ['/feed','/rss','/rss.xml','/feed.xml']){ try{ const x=await getHTML('https://'+h+p); if(/<(rss|feed)[\s>]/i.test(x)) return 'https://'+h+p; }catch(e){} }
  return null;
}
function parseFeed(xml){
  const d=new DOMParser().parseFromString(xml,'text/xml'); if(d.querySelector('parsererror')) return [];
  return [...d.querySelectorAll('item,entry')].slice(0,8).map(n=>{
    const tx=nm=>{ const e=n.getElementsByTagName(nm)[0]; return e?e.textContent.trim():''; };
    let link=''; for(const e of n.getElementsByTagName('link')){ const x=e.textContent.trim()||(e.getAttribute('rel')!=='self'&&e.getAttribute('href'))||''; if(x){ link=x; break; } }
    const ns=(nm,at)=>{ const e=[...n.getElementsByTagNameNS('*',nm)].find(x=>x.getAttribute(at)); return e?e.getAttribute(at):''; };
    let img=ns('thumbnail','url')||ns('content','url')||(()=>{ const en=[...n.getElementsByTagName('enclosure')].find(x=>/image/.test(x.getAttribute('type')||'')); return en?en.getAttribute('url'):''; })();
    if(!img){ const m=(n.textContent||'').match(/<img[^>]+src=["']([^"']+)/i); if(m) img=m[1]; }
    const desc=(tx('description')||tx('summary')||tx('content')).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').slice(0,300);
    const cats=[...n.getElementsByTagName('category')].map(c=>c.textContent.trim()||c.getAttribute('term')||'').filter(Boolean).slice(0,5);
    return {title:tx('title'),link,img:(img||'').replace(/^http:/,'https:'),date:Date.parse(tx('pubDate')||tx('published')||tx('updated'))||0,desc,cats};
  }).filter(x=>x.title&&/^https?:/.test(x.link));
}
async function loadFeed(h){
  try{ const c=JSON.parse(lsGet('fj:'+h)||'null'); if(c&&Date.now()-c.ts<18e5) return c.items; }catch(e){}
  try{
    let fu=lsGet('fu:'+h); if(!fu){ fu=await findFeed(h); if(fu){ try{ localStorage.setItem('fu:'+h,fu); }catch(e){} } }
    if(!fu) return [];
    const items=parseFeed(await getHTML(fu));
    if(items.length){ try{ localStorage.setItem('fj:'+h,JSON.stringify({ts:Date.now(),items})); }catch(e){} }
    return items;
  }catch(e){ return []; }
}
function ago(ts){
  const m=Math.max(1,Math.round((Date.now()-ts)/6e4)), r=new Intl.RelativeTimeFormat(loc(),{numeric:'auto'});
  return m<60?r.format(-m,'minute'):m<1440?r.format(-Math.round(m/60),'hour'):r.format(-Math.round(m/1440),'day');
}
let homeTopic=lsGet('ft')||'all', HF={};
function topicsOf(it){
  const tk=((it.title+' '+it.title+' '+(it.desc||'')+' '+(it.cats||[]).join(' ')).toLowerCase().match(/[a-z]+/g)||[]);
  return Object.entries(TOPIC).map(([k,v])=>{ const st=v.split(' '); return [k,tk.filter(w=>st.some(x=>w.startsWith(x))).length]; }).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,2).map(x=>x[0]);
}
/* Ảnh nền khi tin không có ảnh: đổi file images/placeholder-breaking-news.jpg là xong */
const PH_HTML='<div class="feed-ph"></div>';
const hostOf=u=>{ try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return ''; } };
/* Logo nhỏ của trang báo (favicon, lấy được cho bất kỳ báo nào); lỗi thì hiện chữ cái đầu */
const siteLogo=u=>{ const h=hostOf(u); if(!h) return ''; return `<span class="feed-logo" title="${esc(h)}" data-ch="${esc(h[0].toUpperCase())}"><img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(h)}&sz=64" alt="" loading="lazy" referrerpolicy="no-referrer"></span>`; };
/* Ảnh tin hoặc logo bị lỗi tải → thay bằng ảnh nền / chữ cái */
document.addEventListener('error',e=>{
  const im=e.target; if(!im||im.tagName!=='IMG') return;
  if(im.closest('.feed-logo')){ const w=im.parentElement; im.remove(); w.textContent=w.dataset.ch||''; w.classList.add('txt'); }
  else if(im.closest('.feed-media')) im.outerHTML=PH_HTML;
},true);
const card=it=>{ const sv=articles.some(a=>a.url===it.link); return `<div class="feed-card" data-u="${esc(it.link)}"><div class="feed-media">${it.img?`<img src="${esc(it.img)}" loading="lazy" referrerpolicy="no-referrer" alt="">`:PH_HTML}${siteLogo(it.link)}</div><div class="p-2"><div class="feed-t">${esc(it.title)}</div><div class="small text-muted mt-1">${it.date?ago(it.date):''}${sv?` · <i class="bi bi-check2-circle text-success"></i> ${t('feedSaved')}`:''}</div><div class="d-flex gap-1 mt-2"><button class="btn btn-sm btn-outline-secondary flex-fill" data-fa="copy" title="${t('srcCopy')}"><i class="bi bi-link-45deg"></i></button><button class="btn btn-sm btn-primary flex-fill" data-fa="save" title="${t('saveRead')}"><i class="bi bi-plus-lg"></i></button></div></div></div>`; };
function paint(hosts){
  const box=$('#homeFeed'); if(!box) return;
  const all=hosts.flatMap(h=>HF[h]||[]), cnt={}; all.forEach(it=>it.tp.forEach(k=>{ cnt[k]=(cnt[k]||0)+1; }));
  const ks=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]); if(homeTopic!=='all'&&!cnt[homeTopic]) homeTopic='all';
  const chip=(k,lb,n)=>`<button class="btn btn-sm rounded-pill ${homeTopic===k?'btn-primary':'btn-outline-secondary'}" data-tp="${k}">${lb} <span class="opacity-75">${n}</span></button>`;
  $('#feedChips').innerHTML=all.length?chip('all',t('allT'),all.length)+ks.map(k=>chip(k,TL[lang][k],cnt[k])).join(''):'';
  hosts.forEach(h=>{
    const el=box.querySelector(`[data-h="${CSS.escape(h)}"] .feed-row`); if(!el||HF[h]===undefined) return;
    const its=HF[h].filter(it=>homeTopic==='all'||it.tp.includes(homeTopic));
    el.innerHTML=its.length?its.map(card).join(''):`<div class="small text-muted">${t(HF[h].length?'feedNoTopic':'feedNone')}</div>`;
  });
}
async function renderHome(){
  const box=$('#homeFeed'); if(!box||!user) return;
  const hosts=[]; for(const a of articles){ try{ const h=new URL(a.url).hostname.replace(/^www\./,''); if(!hosts.includes(h)) hosts.push(h); }catch(e){} if(hosts.length>=3) break; }
  if(!hosts.length){ box.innerHTML=''; return; }
  HF={};
  box.innerHTML=`<div class="d-flex align-items-center mb-2"><h6 class="fw-bold mb-0"><i class="bi bi-rss me-2" style="color:var(--brand-t)"></i>${t('feedTitle')}</h6><button class="btn btn-sm btn-outline-secondary ms-auto" id="feedRef"><i class="bi bi-arrow-clockwise"></i></button></div><div id="feedChips" class="d-flex gap-2 mb-3" style="overflow-x:auto;white-space:nowrap"></div>`
    +hosts.map(h=>`<div class="mb-3" data-h="${esc(h)}"><div class="small fw-semibold text-muted mb-1">${esc(h)}</div><div class="feed-row"><div class="text-muted small"><span class="spinner-border spinner-border-sm me-2"></span>${t('lkWait')}</div></div></div>`).join('');
  $('#feedRef').onclick=()=>{ hosts.forEach(h=>{ try{ localStorage.removeItem('fj:'+h); }catch(e){} }); renderHome(); };
  $('#feedChips').onclick=e=>{ const b=e.target.closest('[data-tp]'); if(!b) return; homeTopic=b.dataset.tp; try{ localStorage.setItem('ft',homeTopic); }catch(_){} paint(hosts); };
  hosts.forEach(async h=>{ HF[h]=(await loadFeed(h)).map(it=>({...it,tp:topicsOf(it)})); paint(hosts); });
}

/* ---------- Menu 3 chấm của từng bài ---------- */
let menuArt=null;
function artMenuMain(){
  const a=menuArt;
  $('#artMenu').innerHTML=`<button class="hm-a" data-act="fav"><i class="bi bi-star${a.favorite?'-fill':''} text-warning"></i>${t(a.favorite?'favRemove':'favAdd')}</button><button class="hm-a" data-act="link"><i class="bi bi-link-45deg"></i>${t('copyLink')}</button><button class="hm-a" data-act="move"><i class="bi bi-folder-symlink"></i>${t('moveTo')}<i class="bi bi-chevron-right ms-auto small"></i></button><hr class="my-1"><button class="hm-a danger" data-act="del"><i class="bi bi-trash"></i>${t('delOk')}</button>`;
}
function artMenuMove(){
  const a=menuArt, opt=(id,lb,ic)=>`<button class="hm-a" data-mv="${id}"><i class="bi ${ic}"></i><span class="flex-grow-1 text-truncate">${esc(lb)}</span>${(a.folder_id||'')===id?'<i class="bi bi-check2 ms-auto"></i>':''}</button>`;
  $('#artMenu').innerHTML=`<button class="hm-a" data-act="back"><i class="bi bi-chevron-left"></i>${t('moveTo')}</button><hr class="my-1"><div style="max-height:240px;overflow:auto">${opt('',t('noFolderOpt'),'bi-calendar3')}${folders.map(f=>opt(f.id,f.name,'bi-folder2')).join('')}</div>`;
}
function openArtMenu(id,btn){
  const a=articles.find(x=>x.id===id); if(!a) return; menuArt=a; hideAll(); artMenuMain();
  showPop($('#artMenu'),()=>rectsOf(btn),'below');
}
const rePlace=()=>{ const m=$('#artMenu'); place(m,m._get,m._pref); };
$('#artMenu').addEventListener('click',async e=>{
  const a=menuArt; if(!a) return; const mv=e.target.closest('[data-mv]'), b=e.target.closest('[data-act]');
  if(mv){ hidePop($('#artMenu')); return moveArticle(a,mv.dataset.mv||null); }
  if(!b) return; const act=b.dataset.act;
  if(act==='move'){ artMenuMove(); return rePlace(); }
  if(act==='back'){ artMenuMain(); return rePlace(); }
  hidePop($('#artMenu'));
  if(act==='fav') return favArticle(a);
  if(act==='link') return copyArtLink(a);
  if(act==='del') return delArticle(a);
});
document.addEventListener('pointerdown',e=>{ if(!e.target.closest('#artMenu,.art-more')) hidePop($('#artMenu')); },true);
document.addEventListener('scroll',()=>hidePop($('#artMenu')),true);
async function favArticle(a){
  const v=!a.favorite; const {error}=await sb.from('articles').update({favorite:v}).eq('id',a.id); if(error) return alert(t('favSql'));
  a.favorite=v; if(cur&&cur.id===a.id) cur.favorite=v; renderSide(); toast(t(v?'favOn':'favOff'));
}
async function copyArtLink(a){ const u=location.origin+location.pathname+'#id='+a.id; try{ await navigator.clipboard.writeText(u); toast(t('linkCopied')); }catch(e){ prompt('Link',u); } }
async function moveArticle(a,to){
  if((a.folder_id||null)===to) return; const f=folders.find(z=>z.id===to);
  if(!await ask(f?t('moveQ').replace('{f}',f.name):t('moveOutQ'),t('moveOk'),false)) return;
  const {error}=await sb.from('articles').update({folder_id:to}).eq('id',a.id); if(error) return alert(error.message);
  const was=cur&&cur.id===a.id; await loadData(); if(was) showEmpty(); toast(f?t('moved').replace('{f}',f.name):t('movedOut'));
}
async function delArticle(a){
  if(!await ask(t('delArt'),t('delOk'))) return;
  const {error}=await sb.from('articles').delete().eq('id',a.id); if(error) return alert(error.message);
  const was=cur&&cur.id===a.id; await loadData(); if(was) showEmpty(); toast(t('deleted'));
}

/* ---------- Xem trước bài mới trong cửa sổ riêng ---------- */
function previewWin(u){
  if(matchMedia('(pointer:coarse)').matches){ window.open(u,'_blank','noopener'); toast(t('prevHint')); return; }
  const W=Math.min(1000,screen.availWidth-80), H=Math.min(820,screen.availHeight-80), L=Math.max(0,screen.availWidth-W-40);
  const w=window.open('about:blank','readupPreview',`popup=yes,width=${W},height=${H},left=${L},top=40`);
  if(!w){ window.open(u,'_blank','noopener'); return; }
  try{ w.opener=null; }catch(e){} w.location.href=u; w.focus(); toast(t('prevHint'));
}
$('#readerBox').addEventListener('click',async e=>{
  const c=e.target.closest('.feed-card'); if(!c) return; const u=c.dataset.u, fa=e.target.closest('[data-fa]');
  if(fa&&fa.dataset.fa==='copy'){ try{ await navigator.clipboard.writeText(u); toast(t('srcCopied')); }catch(_){ prompt('Link',u); } return; }
  if(fa&&fa.dataset.fa==='save'){ $('#urlIn').value=u; $('#fetchBtn').click(); return; }
  previewWin(u);
});

/* ---------- Cỡ chữ ---------- */
const fsGet=()=>parseFloat(lsGet('fs'))||1.08;
function fsSet(v){ v=Math.round(Math.min(1.8,Math.max(.85,v))*100)/100; document.documentElement.style.setProperty('--rf',v+'rem'); try{ localStorage.setItem('fs',v); }catch(e){} hideAll(); }
$('#instBtn').onclick=()=>{ $('#instBody').innerHTML=t('installSteps'); bootstrap.Modal.getOrCreateInstance($('#instModal')).show(); };

/* ---------- Gợi ý từ / cụm từ (miễn phí, chạy ngay trong trình duyệt) ---------- */
const STOPS=new Set('the be to of and a in that have i it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is are was were been has had did does said made since while during until within without between against among across before under although though whether however therefore already still very much many more such each both several every wider fallen'.split(' '));
const TOPIC={edu:'school pupil student teacher education curriculum exam universit classroom lesson tuition learning',eco:'econom market inflation tax bank growth trade business invest price profit budget debt wage',pol:'government minister election parliament policy party vote council mayor campaign president reform',health:'health hospital patient disease doctor treatment mental medical drug surgery symptom',tech:'technolog software digital data internet computer robot online cyber algorithm device',env:'climate energy carbon pollution wildlife emission renewable environment species forest fossil warming',sci:'research scientist study experiment discover evidence theory laborator',law:'police court crime trial prison judge arrest lawyer sentence',sport:'football soccer team player season tournament league coach olympic championship match',culture:'film movie music album actor artist festival book theatre celebrity series singer'};
const TL={vi:{edu:'Giáo dục',eco:'Kinh tế',pol:'Chính trị',health:'Sức khỏe',tech:'Công nghệ',env:'Môi trường',sci:'Khoa học',law:'Pháp luật',sport:'Thể thao',culture:'Văn hóa'},en:{edu:'Education',eco:'Economy',pol:'Politics',health:'Health',tech:'Technology',env:'Environment',sci:'Science',law:'Law & crime',sport:'Sport',culture:'Culture'}};
const PART=new Set(['up','down','out','off','over','back','away','through','around','apart','into']);
const VERB=/^(set|put|take|took|taken|give|gave|come|came|go|went|get|got|turn|bring|brought|carry|carried|break|broke|look|run|ran|pick|pull|hold|held|keep|kept|make|made|clos|shut|cut|point|work|find|found|step|stand|move|roll|call|hand|build|built|fall|fell|pass|show|sign|pay|paid|sort|sell|sold|speak|spoke|throw|threw|try|tried|wind|wipe)(e|es|s|ed|d|ing)?$/;
let FREQ=null;
async function loadFreq(){
  if(FREQ) return FREQ; let tx=lsGet('freq10k');
  if(!tx){ try{ const r=await fetch('https://cdn.jsdelivr.net/gh/first20hours/google-10000-english@master/google-10000-english-no-swears.txt'); if(r.ok){ tx=await r.text(); try{ localStorage.setItem('freq10k',tx); }catch(e){} } }catch(e){} }
  FREQ=new Map(); if(tx) tx.split(/\s+/).filter(Boolean).forEach((w,i)=>FREQ.set(w,i)); return FREQ;
}
function rk(w){
  if(STOPS.has(w)) return 0; let b=1e9;
  for(const x of [w,w.replace(/ies$/,'y'),w.replace(/es$/,''),w.replace(/s$/,''),w.replace(/ied$/,'y'),w.replace(/ed$/,''),w.replace(/d$/,''),w.replace(/ing$/,''),w.replace(/ing$/,'e'),w.replace(/ly$/,'')]){ const r=FREQ.get(x); if(r!==undefined&&r<b) b=r; }
  return b;
}
function analyze(text,lvl){
  const lo=[2500,4000,6500][lvl-1], W=new Map(), P=new Map(), all=[];
  const add=(m,k,sc)=>{ const o=m.get(k)||{n:0,sc}; o.n++; m.set(k,o); };
  for(const cl of text.split(/[.,;:!?()"“”\n—–]+/)){
    const tk=(cl.match(/[A-Za-z][A-Za-z'’-]*/g)||[]).map((x,i)=>{ const w=x.toLowerCase().replace(/['’]s$/,''); return {w,acr:/^[A-Z]{2,}$/.test(x),pr:/^[A-Z]/.test(x)&&(i>0||rk(w)>=1e9)}; });
    tk.forEach(o=>all.push(o.w));
    const C=o=>!o.pr&&!o.acr&&o.w.length>=3&&rk(o.w)>=300, H=(...a)=>Math.max(...a.map(o=>rk(o.w)))>lo;
    tk.forEach((a,i)=>{
      const b=tk[i+1], c=tk[i+2];
      if(!a.pr&&!a.acr&&a.w.length>=5&&/^[a-z]+(-[a-z]+)?$/.test(a.w)&&rk(a.w)>lo) add(W,a.w,(rk(a.w)>=1e9?3:5)+(/(tion|ment|ity|ive|ous|ance|ence|ical)s?$/.test(a.w)?1:0));
      if(b&&!a.pr&&PART.has(b.w)&&VERB.test(a.w)) add(P,a.w+' '+b.w,6);
      else if(b&&C(a)&&C(b)&&H(a,b)) add(P,a.w+' '+b.w,4);
      if(c&&C(a)&&C(c)&&['of','for','to','in','on','with'].includes(b.w)&&H(a,c)) add(P,a.w+' '+b.w+' '+c.w,3);
    });
  }
  const top=(m,k)=>[...m.entries()].sort((x,y)=>(y[1].sc+y[1].n*2)-(x[1].sc+x[1].n*2)).slice(0,k);
  const phrases=top(P,8), pw=new Set(phrases.flatMap(p=>p[0].split(' ')));
  const words=top(new Map([...W].filter(([w])=>!pw.has(w))),14);
  const tp=Object.entries(TOPIC).map(([k,v])=>{ const st=v.split(' '); return [k,all.filter(w=>st.some(x=>w.startsWith(x))).length]; }).filter(x=>x[1]>=3).sort((x,y)=>y[1]-x[1]).slice(0,2);
  return {phrases,words,topics:tp.map(x=>x[0])};
}
async function gbatch(arr){
  if(!arr.length) return null;
  try{ const r=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q='+encodeURIComponent(arr.join('\n'))); const j=await r.json(); const o=(j[0]||[]).map(x=>(x[0]||'').replace(/\n+$/,'')); return o.length===arr.length?o:null; }catch(e){ return null; }
}
async function openSug(){
  const box=$('#sgBody'); if(!box||!cur) return;
  box.innerHTML=`<div class="text-muted small"><span class="spinner-border spinner-border-sm me-2"></span>${t('lkWait')}</div>`;
  const F=await loadFreq(), lvl=+(lsGet('sgl')||2), r=analyze($('#reader').innerText||$('#reader').textContent||'',lvl), items=[...r.phrases,...r.words].map(x=>x[0]);
  const row=([k,o])=>`<div class="sg-row d-flex align-items-center gap-2 py-1 border-bottom" data-t="${esc(k)}"><div class="flex-grow-1"><b>${esc(k)}</b>${o.n>1?` <span class="badge text-bg-secondary">×${o.n}</span>`:''}<div class="sg-m small text-muted"></div></div><button class="btn btn-sm btn-outline-secondary" data-look><i class="bi bi-translate"></i></button><button class="btn btn-sm btn-primary" data-add><i class="bi bi-plus-lg"></i></button></div>`;
  box.innerHTML=`<div class="d-flex flex-wrap align-items-center gap-2 mb-2"><span class="small fw-semibold">${t('sgTopic')}:</span>${r.topics.map(k=>`<span class="badge text-bg-danger">${TL[lang][k]}</span>`).join('')||'<span class="small text-muted">—</span>'}<span class="ms-auto small">${t('sgLevel')}</span><select id="sgLvl" class="form-select form-select-sm" style="width:auto">${[1,2,3].map(i=>`<option value="${i}" ${i===lvl?'selected':''}>${t('lvl'+i)}</option>`).join('')}</select></div>`
    +(F.size?'':`<div class="alert alert-warning py-1 small">${t('sgNoList')}</div>`)
    +(r.phrases.length?`<div class="small fw-bold mt-2">${t('sgPhrases')}</div>${r.phrases.map(row).join('')}`:'')
    +(r.words.length?`<div class="small fw-bold mt-2">${t('sgWords')}</div>${r.words.map(row).join('')}`:'')
    +(items.length?'':`<div class="small text-muted">${t('sgNone')}</div>`);
  const tr=await gbatch(items); if(tr) box.querySelectorAll('.sg-row').forEach((el,i)=>{ el.querySelector('.sg-m').textContent=tr[i]||''; });
}
async function addSug(row,btn){
  const txt=row.dataset.t, rg=findRange(txt); if(!rg){ toast(t('sgNF')); return; }
  btn.disabled=true; const mn=row.querySelector('.sg-m').textContent||await gtranslate(txt,'vi');
  const m=await createMark('green',rg); cur.notes[m.dataset.id]=mn?`${txt} = ${mn}`:''; m.classList.toggle('has-note',!!mn);
  await saveArticle(); btn.innerHTML='<i class="bi bi-check2-lg"></i>'; btn.className='btn btn-sm btn-success'; toast(t('sgAdded'));
}
function fmtD(v){ if(!v) return ''; const d=new Date(v); return isNaN(d)?v:d.toLocaleDateString(loc(),{year:'numeric',month:'long',day:'numeric'}); }
function infoCard(a,keep){
  const m=a.meta||{}, fo=folders.find(f=>f.id===a.folder_id);
  const w=m.words?`${Number(m.words).toLocaleString(loc())} ${t('words')} · ~${Math.max(1,Math.round(m.words/220))} ${t('min')}`:'—';
  const row=(k,v)=>`<tr><th class="fw-semibold text-muted" style="width:32%">${t(k)}</th><td>${v}</td></tr>`;
  const inp=(id,v)=>`<input id="${id}" class="form-control form-control-sm" value="${esc(v)}">`;
  return `<div class="reader-card mt-3${keep?'':' enter'}"><h6 class="fw-bold mb-3"><i class="bi bi-info-circle me-2"></i>${t('infoTitle')}</h6>
  <div class="table-responsive"><table class="table table-sm align-middle mb-3"><tbody>
  ${row('iTitle',inp('iTi',a.title))}${row('iAuthor',inp('iAu',m.author||''))}${row('iDate',inp('iDa',fmtD(m.published)))}${row('iSite',inp('iSi',m.site||''))}
  ${row('iLink',`<a href="${esc(a.url)}" target="_blank" rel="noopener" class="text-break">${esc(a.url)}</a>`)}
  ${row('iSaved',new Date(a.created_at).toLocaleString(loc()))}${row('iFolder',esc(fo?fo.name:t('noFolderOpt')))}${row('iWords',w)}
  </tbody></table></div><button class="btn btn-sm btn-primary" id="saveInfo"><i class="bi bi-check2 me-1"></i>${t('saveInfo')}</button></div>`;
}
function openArticle(a,keep,restore){
  if(isPdfRow(a)) return openPdf(a,keep,restore);
  cur=a; cur.notes=cur.notes||{}; renderSide(); lastOpen=Date.now();
  if(!keep){ hideAll(); try{ history.replaceState(null,'','#id='+a.id); localStorage.setItem('last',a.id); }catch(e){} }
  document.title=a.title+' · Readup Support News';
  $('#readerBox').innerHTML=`<div class="reader-card${keep?'':' enter'}"><div style="max-width:72ch;margin:auto">
    <h1 class="fw-bold mb-2" style="font-size:clamp(1.5rem,3vw,2.1rem);line-height:1.3">${esc(a.title)}</h1>
    <div class="d-flex flex-wrap align-items-center gap-2 small text-muted mb-3">
      <a href="${esc(a.url)}" target="_blank" rel="noopener" class="text-decoration-none"><i class="bi bi-box-arrow-up-right me-1"></i>${t('source')}</a>
      <span>${new Date(a.created_at).toLocaleString(loc())}</span>
      
      <div class="btn-group btn-group-sm ms-auto"><button class="btn btn-outline-secondary" id="fsDn" title="A−">A−</button><button class="btn btn-outline-secondary" id="fsUp" title="A+">A+</button></div><button class="btn btn-sm btn-outline-primary" id="sgBtn"><i class="bi bi-lightbulb me-1"></i><span class="d-none d-sm-inline">${t('sg')}</span></button>
    </div>
    <div class="alert bg-body-tertiary border small py-2"><i class="bi bi-lightbulb text-warning me-1"></i>${t('tip')}</div><div class="collapse" id="sgBox"><div class="border rounded-3 p-2 mb-3" id="sgBody"></div></div></div>
    <div id="reader">${a.content}</div></div>${infoCard(a,keep)}`;
  $('#fsUp').onclick=()=>fsSet(fsGet()+.08); $('#fsDn').onclick=()=>fsSet(fsGet()-.08);
  $('#sgBtn').onclick=()=>{ const bx=$('#sgBox'), c=bootstrap.Collapse.getOrCreateInstance(bx,{toggle:false}); if(bx.classList.contains('show')) c.hide(); else { c.show(); openSug(); } };
  $('#sgBody').addEventListener('click',e=>{ const row=e.target.closest('.sg-row'); if(!row) return; if(e.target.closest('[data-look]')){ lk.range=null; openLookup(row.dataset.t,null,'vi'); } const ad=e.target.closest('[data-add]'); if(ad&&!ad.disabled) addSug(row,ad); });
  $('#sgBody').addEventListener('change',e=>{ if(e.target.id==='sgLvl'){ try{ localStorage.setItem('sgl',e.target.value); }catch(_){} openSug(); } });
    $('#saveInfo').onclick=async()=>{
    const meta={...(a.meta||{}),author:$('#iAu').value.trim(),published:$('#iDa').value.trim(),site:$('#iSi').value.trim()};
    const title=$('#iTi').value.trim()||a.title;
    const {error}=await sb.from('articles').update({title,meta}).eq('id',a.id); if(error) return alert(t('saveFail')+error.message);
    a.title=title; a.meta=meta; const x=articles.find(z=>z.id===a.id); if(x) x.title=title;
    $('#readerBox h1').textContent=title; renderSide(); toast(t('saved'));
  };
    if(!keep){
    const pos=restore?(+lsGet('pos:'+a.id)||0):0;
    if(restore&&pos) [0,500,1300].forEach(ms=>setTimeout(()=>{ if(cur&&cur.id===a.id&&Date.now()-lastOpen<1700&&Math.abs(scrollY-pos)>8) window.scrollTo(0,pos); },ms));
    else window.scrollTo({top:0,behavior:'smooth'});
  }
}
async function saveArticle(){
  if(!cur) return; cur.content=$('#reader').innerHTML;
  const {error}=await sb.from('articles').update({content:cur.content,notes:cur.notes}).eq('id',cur.id);
  if(error) alert(t('saveFail')+error.message);
}

/* ---------- Highlight nhiều màu ---------- */
const hidePop=el=>el.classList.remove('on');
const hideMenu=()=>hidePop($('#hlMenu'));
const hideAll=()=>{ hideMenu(); hidePop($('#editor')); hidePop($('#tip')); hidePop($('#artMenu')); };
function lsGet(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
const canHover=matchMedia('(hover:hover)').matches;
let down=false, inUI=false, uiT=null, selT=null, lastOpen=0, posT=null;
const selText=()=>((menuMark?menuMark.textContent:(savedRange?savedRange.toString():''))||'').replace(/\s+/g,' ').trim();
function clearSel(){ const s=getSelection(), r=$('#reader'); if(s.anchorNode&&r&&r.contains(s.anchorNode)) s.removeAllRanges(); savedRange=null; }
function rectsOf(x){ const a=[...x.getClientRects()].filter(r=>r.width>1&&r.height>1); return a.length?a:[x.getBoundingClientRect()]; }
/* Đặt bảng cạnh vùng chữ (dưới / trên / phải / trái) để không đè lên chữ */
function place(el,get,pref){
  const rs=get(); if(!rs||!rs.length) return;
  const f=rs[0], l=rs[rs.length-1], gap=10, vw=innerWidth, vh=innerHeight, w=el.offsetWidth, h=el.offsetHeight;
  const L=Math.min(...rs.map(r=>r.left)), R=Math.max(...rs.map(r=>r.right)), cl=x=>Math.min(vw-w-8,Math.max(8,x)), sideTop=Math.min(vh-h-8,Math.max(8,f.top));
  const cand={
    below:()=>l.bottom+gap+h<=vh-8&&[cl(l.left),l.bottom+gap,0],
    above:()=>f.top-gap-h>=8&&[cl(f.left),f.top-gap-h,1],
    right:()=>R+gap+w<=vw-8&&[R+gap,sideTop,0],
    left:()=>L-gap-w>=8&&[L-gap-w,sideTop,0]};
  let pos=null; for(const k of (pref==='above'?['above','below','right','left']:['below','above','right','left'])){ pos=cand[k](); if(pos) break; }
  if(!pos) pos=[cl(l.left),Math.min(vh-h-8,l.bottom+gap),0];
  el.style.left=pos[0]+'px'; el.style.top=pos[1]+'px';
  el.style.setProperty('--dy',pos[2]?'6px':'-6px'); el.style.setProperty('--oy',pos[2]?'100%':'0');
}
function showPop(el,get,pref){ el._get=get; el._pref=pref; place(el,get,pref); el.classList.add('on'); }
const reflow=()=>[$('#hlMenu'),$('#editor')].forEach(el=>{ if(el.classList.contains('on')&&el._get) place(el,el._get,el._pref); });
addEventListener('scroll',()=>{
  requestAnimationFrame(reflow); hidePop($('#tip'));
  if(!cur||Date.now()-lastOpen<1700) return; clearTimeout(posT);
  posT=setTimeout(()=>{ try{ localStorage.setItem('pos:'+cur.id,String(Math.round(scrollY))); }catch(e){} },300);
},{passive:true});
addEventListener('resize',reflow);
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ hideAll(); clearSel(); } });
['show.bs.modal','show.bs.offcanvas'].forEach(ev=>document.addEventListener(ev,hideAll));

function openMenu(get,mark){
  menuMark=mark; hidePop($('#tip'));
  const n=mark&&cur?(cur.notes[mark.dataset.id]||''):'', nb=$('#hlNote'); nb.style.display=n?'block':'none'; nb.textContent=n;
  $('#hlColors').innerHTML=COLORS.map(c=>`<button class="hm-c ${mark&&(mark.dataset.c||'yellow')===c?'cur':''}" data-c="${c}">${t('c_'+c)}</button>`).join('');
  const any=!!$('#reader mark');
  $('#actNote').style.display=$('#actRem').style.display=mark?'block':'none';
  $('#actAll').style.display=any?'block':'none';
  $('#hlActs').style.display=(mark||any)?'grid':'none';
  showPop($('#hlMenu'),get);
}
/* Đồng bộ bảng với vùng chữ đang chọn (kể cả khi kéo tay cầm chọn trên iPhone) */
function syncSel(){
  if(down||inUI||document.body.classList.contains('modal-open')||/INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const s=getSelection(), r=$('#reader'), on=$('#hlMenu').classList.contains('on');
  if(!r||s.isCollapsed||!r.contains(s.anchorNode)||!r.contains(s.focusNode)){ if(on&&!menuMark) hideMenu(); return; }
  const rg=s.getRangeAt(0), p=rg.commonAncestorContainer, am=(p.nodeType===1?p:p.parentElement)?.closest('mark'), mk=am&&r.contains(am)?am:null;
  savedRange=rg.cloneRange(); openMenu(mk?()=>rectsOf(mk):()=>savedRange?rectsOf(savedRange):[],mk);
}
const syncLater=ms=>{ clearTimeout(selT); selT=setTimeout(syncSel,ms||220); };
document.addEventListener('selectionchange',()=>syncLater());
/* Chạm/nhấn ra ngoài -> đóng bảng và bỏ vùng chọn cũ */
document.addEventListener('pointerdown',e=>{
  down=true;
  if(e.target.closest('#hlMenu,#editor,.modal,.offcanvas')){ inUI=true; clearTimeout(uiT); return; }
  if($('#hlMenu').classList.contains('on')){ hideMenu(); clearSel(); }
  hidePop($('#tip'));
},true);
const pUp=()=>{ down=false; clearTimeout(uiT); uiT=setTimeout(()=>{ inUI=false; },400); syncLater(60); };
document.addEventListener('pointerup',pUp,true); document.addEventListener('pointercancel',pUp,true);
$('#hlMenu').addEventListener('mousedown',e=>e.preventDefault());
document.addEventListener('click',e=>{
  const m=e.target.closest('#reader mark'); if(m&&getSelection().isCollapsed) openMenu(()=>rectsOf(m),m);
});
$('#actCopy').onclick=async()=>{
  const txt=selText(); hideMenu(); clearSel(); if(!txt) return;
  try{ await navigator.clipboard.writeText(txt); toast(t('copied')); }catch(e){ try{ document.execCommand('copy'); }catch(_){} }
};
async function createMark(c,range){
  const id='h'+Date.now().toString(36), m=document.createElement('mark'); m.dataset.id=id; m.dataset.c=c;
  const frag=range.extractContents();
  frag.querySelectorAll('mark').forEach(x=>{ delete cur.notes[x.dataset.id]; x.replaceWith(...x.childNodes); });
  m.appendChild(frag); range.insertNode(m); getSelection().removeAllRanges(); savedRange=null;
  cur.notes[id]=''; return m;
}
function findRange(txt){
  const r=$('#reader'); if(!r||!txt) return null; const q=txt.toLowerCase(), w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT); let n;
  while((n=w.nextNode())){ if(n.parentElement.closest('mark')) continue; const i=n.nodeValue.replace(/\u00a0/g,' ').toLowerCase().indexOf(q); if(i>=0){ const g=document.createRange(); g.setStart(n,i); g.setEnd(n,i+txt.length); return g; } }
  return null;
}
$('#hlColors').onclick=async e=>{
  const b=e.target.closest('[data-c]'); if(!b) return; const c=b.dataset.c; hideMenu();
  if(menuMark){ menuMark.dataset.c=c; return saveArticle(); }
  if(!savedRange) return;
  const m=await createMark(c,savedRange); await saveArticle(); openEditor(m);
};

/* ---------- Tra cứu từ / cụm từ / câu ---------- */
let lk={text:'',mark:null,result:''}, lkSeq=0;
async function gtranslate(q,tl){
  try{ const r=await fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl='+tl+'&dt=t&q='+encodeURIComponent(q)); if(r.ok){ const j=await r.json(); const x=(j[0]||[]).map(a=>a[0]).join(''); if(x) return x; } }catch(e){}
  try{ const r=await fetch('https://api.mymemory.translated.net/get?q='+encodeURIComponent(q.slice(0,480))+'&langpair='+(tl==='vi'?'en|vi':'vi|en')); const j=await r.json(); const x=j.responseData&&j.responseData.translatedText; if(x) return x; }catch(e){}
  return '';
}
async function define(w){
  try{ const r=await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(w.toLowerCase())); if(!r.ok) return null; const j=await r.json(); return j[0]||null; }catch(e){ return null; }
}
function openLookup(txt,mark,tl){
  lk={text:txt,mark:mark,result:'',range:lk.range}; $('#lkText').value=txt; if(tl) $('#lkLang').value=tl;
  bootstrap.Modal.getOrCreateInstance($('#lkModal')).show(); runLookup();
}
$('#actLook').onclick=()=>{
  const m=menuMark, txt=selText(), rg=savedRange; hideMenu(); if(!txt) return;
  lk.range=m?null:rg; clearSel(); openLookup(txt,m);
};
$('#lkModal').addEventListener('hidden.bs.modal',()=>{ try{ localStorage.removeItem('lk'); }catch(e){} });
$('#lkGo').onclick=()=>runLookup(); $('#lkLang').onchange=()=>runLookup();
$('#lkOut').onclick=e=>{ const b=e.target.closest('#lkAudio'); if(b) new Audio(b.dataset.src).play(); };
async function runLookup(){
  const q=$('#lkText').value.replace(/\s+/g,' ').trim().slice(0,1500); if(!q) return;
  try{ localStorage.setItem('lk',JSON.stringify({art:cur&&cur.id,text:$('#lkText').value.trim(),tl:$('#lkLang').value,mark:lk.mark?lk.mark.dataset.id:null,ts:Date.now()})); }catch(e){}
  const my=++lkSeq, tl=$('#lkLang').value, isWord=/^[\p{L}'’-]+$/u.test(q), short=q.split(' ').length<=3, out=$('#lkOut');
  out.innerHTML=`<div class="text-muted small"><span class="spinner-border spinner-border-sm me-2"></span>${t('lkWait')}</div>`; lk.result='';
  const e=encodeURIComponent(q), w=encodeURIComponent(q.toLowerCase()), slug=encodeURIComponent(q.toLowerCase().replace(/\s+/g,'-')), L=[];
  if(short){ L.push(['Oxford',`https://www.oxfordlearnersdictionaries.com/search/english/?q=${w}`],['Cambridge',`https://dictionary.cambridge.org/dictionary/english/${slug}`],['Cambridge EN–VI',`https://dictionary.cambridge.org/dictionary/english-vietnamese/${slug}`]); }
  L.push(['Google Translate',`https://translate.google.com/?sl=auto&tl=${tl}&text=${e}&op=translate`],['DeepL',`https://www.deepl.com/translator#auto/${tl}/${e}`]);
  $('#lkLinks').innerHTML=L.map(([n,h])=>`<a class="btn btn-sm btn-outline-secondary" target="_blank" rel="noopener" href="${h}"><i class="bi bi-box-arrow-up-right me-1"></i>${n}</a>`).join('');
  const [tr,df]=await Promise.all([gtranslate(q,tl),(isWord&&tl==='vi')?define(q):Promise.resolve(null)]);
  if(my!==lkSeq) return;
  let html='', txt=tr||'';
  html+= tr ? `<div class="small text-muted">${t('lkTrans')}</div><div class="fs-5 fw-semibold" style="color:var(--brand-t)">${esc(tr)}</div>` : `<div class="alert alert-warning py-2 small">${t('lkFail')}</div>`;
  if(df){
    const ph=df.phonetic||((df.phonetics||[]).find(p=>p.text)||{}).text||'', au=((df.phonetics||[]).find(p=>p.audio)||{}).audio||'', ms=(df.meanings||[]).slice(0,3);
    html+=`<div class="d-flex align-items-center gap-2 mt-3"><span class="fw-bold">${esc(df.word)}</span><span class="text-muted">${esc(ph)}</span>${au?`<button class="btn btn-sm btn-outline-secondary py-0" id="lkAudio" data-src="${esc(au)}"><i class="bi bi-volume-up"></i></button>`:''}</div><div class="small text-muted mt-2">${t('lkDef')}</div>`;
    html+=ms.map(m=>`<div class="mt-1"><i class="text-muted">${esc(m.partOfSpeech)}</i><ol class="mb-1 ps-3">${(m.definitions||[]).slice(0,2).map(d=>`<li>${esc(d.definition)}${d.example?`<div class="small text-muted fst-italic">“${esc(d.example)}”</div>`:''}</li>`).join('')}</ol></div>`).join('');
    const d0=ms[0]&&ms[0].definitions&&ms[0].definitions[0];
    txt=`${q}${ph?' '+ph:''}${tr?' = '+tr:''}${d0?`\n(${ms[0].partOfSpeech}) ${d0.definition}`:''}`;
  } else if(isWord&&tl==='vi') html+=`<div class="small text-muted mt-3">${t('lkNoDict')}</div>`;
  out.innerHTML=html; lk.result=txt;
}
$('#lkCopy').onclick=async()=>{ if(!lk.result) return; try{ await navigator.clipboard.writeText(lk.result); toast(t('copied')); }catch(e){} };
$('#lkInsert').onclick=async()=>{
  if(!lk.result) return; let m=lk.mark;
  if(!m){ const rg=lk.range||findRange(lk.text); if(!rg) return; m=await createMark('yellow',rg); }
  const old=(cur.notes[m.dataset.id]||'').trim(); cur.notes[m.dataset.id]=old?old+'\n'+lk.result:lk.result; m.classList.add('has-note');
  await saveArticle(); bootstrap.Modal.getOrCreateInstance($('#lkModal')).hide(); toast(t('noteAdded'));
};
$('#actNote').onclick=()=>{ const m=menuMark; hideMenu(); if(m) openEditor(m); };
$('#actRem').onclick=async()=>{ const m=menuMark; hideMenu(); if(!m) return; delete cur.notes[m.dataset.id]; m.replaceWith(...m.childNodes); $('#reader').normalize(); await saveArticle(); };
$('#actAll').onclick=async()=>{
  hideMenu(); if(!await ask(t('clearQ'),t('delOk'))) return;
  $('#reader').querySelectorAll('mark').forEach(m=>m.replaceWith(...m.childNodes)); $('#reader').normalize(); cur.notes={}; await saveArticle();
};

/* ---------- Ghi chú ---------- */
function openEditor(m){
  editId=m.dataset.id; $('#noteTxt').value=cur.notes[editId]||''; showPop($('#editor'),()=>rectsOf(m)); $('#noteTxt').focus({preventScroll:true});
}
$('#noteClose').onclick=()=>{hidePop($('#editor'));};
$('#noteSave').onclick=async()=>{
  const v=$('#noteTxt').value.trim(), m=$(`#reader mark[data-id="${editId}"]`);
  cur.notes[editId]=v; if(m) m.classList.toggle('has-note',!!v);
  await saveArticle(); hidePop($('#editor'));
};
document.addEventListener('mouseover',e=>{
  const tp=$('#tip'), m=e.target.closest('#reader mark');
  if(!canHover||!m||!cur||$('#hlMenu').classList.contains('on')||$('#editor').classList.contains('on')){ hidePop(tp); return; }
  const n=cur.notes[m.dataset.id]; if(!n){ hidePop(tp); return; }
  tp.textContent=n; place(tp,()=>rectsOf(m),'above'); tp.classList.add('on');
});
