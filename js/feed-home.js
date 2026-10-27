/* ===== Bổ sung (không sửa code cũ): feed nhiều nguồn, chủ đề Logistics / Supply chain, link mở cửa sổ nhỏ ===== */
(()=>{
  /* Chủ đề mới */
  TOPIC.logi='logistic freight airfreight cargo shipping shipment ship warehous fulfil courier trucking truck container carrier seaport ports customs forwarder deliver';
  TOPIC.supply='supply supplier procure inventor sourcing shortage manufactur reshor nearshor stockpil bottleneck backlog';
  Object.assign(TL.vi,{logi:'Logistics',supply:'Chuỗi cung ứng'});
  Object.assign(TL.en,{logi:'Logistics',supply:'Supply chain'});
  const PRI=['logi','supply'];

  /* Nguồn RSS mặc định (findFeed cũ sẽ tự dò RSS nếu nguồn không có trong danh sách này) */
  Object.assign(FEEDS,{
    'supplychaindive.com':'https://www.supplychaindive.com/feeds/news/',
    'freightwaves.com':'https://www.freightwaves.com/news/feed',
    'theloadstar.com':'https://theloadstar.com/feed/',
    'logisticsviewpoints.com':'https://logisticsviewpoints.com/feed/',
    'techcrunch.com':'https://techcrunch.com/feed/',
    'sciencedaily.com':'https://www.sciencedaily.com/rss/all.xml'
  });
  const DEF_LOGI=['supplychaindive.com','freightwaves.com','theloadstar.com','logisticsviewpoints.com','supplychainbrain.com'];
  const DEF_GEN=['bbc.com','theguardian.com','npr.org','aljazeera.com','theconversation.com','e.vnexpress.net','techcrunch.com','sciencedaily.com'];
  let RECENT=new Set();
  const vi=()=>lang==='vi';

  /* Vẽ lại thẻ + chip: Logistics và Chuỗi cung ứng luôn đứng đầu */
  paint=function(hosts){
    const box=$('#homeFeed'); if(!box) return;
    const all=hosts.flatMap(h=>HF[h]||[]), cnt={}; all.forEach(it=>it.tp.forEach(k=>{ cnt[k]=(cnt[k]||0)+1; }));
    const rest=Object.keys(cnt).filter(k=>!PRI.includes(k)).sort((a,b)=>cnt[b]-cnt[a]), ks=[...PRI,...rest];
    if(homeTopic!=='all'&&!ks.includes(homeTopic)) homeTopic='all';
    const chip=(k,lb,n)=>`<button class="btn btn-sm rounded-pill ${homeTopic===k?'btn-primary':'btn-outline-secondary'}" data-tp="${k}">${lb} <span class="opacity-75">${n}</span></button>`;
    $('#feedChips').innerHTML=chip('all',t('allT'),all.length)+ks.map(k=>chip(k,TL[lang][k],cnt[k]||0)).join('');
    hosts.forEach(h=>{
      const blk=box.querySelector(`[data-h="${CSS.escape(h)}"]`), el=blk&&blk.querySelector('.feed-row'); if(!el||HF[h]===undefined) return;
      const its=HF[h].filter(it=>homeTopic==='all'||it.tp.includes(homeTopic));
      el.innerHTML=its.length?its.map(card).join(''):`<div class="small text-muted">${t(HF[h].length?'feedNoTopic':'feedNone')}</div>`;
      blk.classList.toggle('d-none',homeTopic!=='all'&&!its.length);
    });
  };

  /* Trang chủ: nguồn Logistics/Supply chain → nguồn người dùng đọc gần đây → các nguồn tổng hợp khác */
  renderHome=async function(){
    const box=$('#homeFeed'); if(!box||!user) return;
    const recent=[]; for(const a of articles){ try{ const h=new URL(a.url).hostname.replace(/^www\./,''); if(!recent.includes(h)) recent.push(h); }catch(e){} if(recent.length>=3) break; }
    RECENT=new Set(recent);
    const hosts=[...new Set([...DEF_LOGI,...recent,...DEF_GEN])];
    HF={};
    const title=vi()?'Bài mới từ nhiều nguồn':'Latest from many sources', badge=vi()?'bạn đọc gần đây':'recently read';
    box.innerHTML=`<div class="d-flex align-items-center mb-2"><h6 class="fw-bold mb-0"><i class="bi bi-rss me-2" style="color:var(--brand-t)"></i>${title}</h6><button class="btn btn-sm btn-outline-secondary ms-auto" id="feedRef"><i class="bi bi-arrow-clockwise"></i></button></div><div id="feedChips" class="d-flex gap-2 mb-3" style="overflow-x:auto;white-space:nowrap"></div>`
      +hosts.map(h=>`<div class="mb-3" data-h="${esc(h)}"><div class="small fw-semibold text-muted mb-1">${esc(h)}${RECENT.has(h)?` <span class="badge text-bg-danger feed-grp ms-1">${badge}</span>`:''}</div><div class="feed-row"><div class="text-muted small"><span class="spinner-border spinner-border-sm me-2"></span>${t('lkWait')}</div></div></div>`).join('');
    $('#feedRef').onclick=()=>{ hosts.forEach(h=>{ try{ localStorage.removeItem('fj:'+h); }catch(e){} }); renderHome(); };
    $('#feedChips').onclick=e=>{ const b=e.target.closest('[data-tp]'); if(!b) return; homeTopic=b.dataset.tp; try{ localStorage.setItem('ft',homeTopic); }catch(_){} paint(hosts); };
    paint(hosts);
    hosts.forEach(async h=>{ HF[h]=(await loadFeed(h)).map(it=>({...it,tp:topicsOf(it)})); paint(hosts); });
  };

  /* Mọi link http(s) trong web → mở cửa sổ nhỏ như khi bấm bài ở ngoài.
     Ngoại lệ: link nằm trong nội dung bài báo đã lưu (#reader) giữ nguyên hành vi cũ. */
  function popLink(u){
    if(matchMedia('(pointer:coarse)').matches){ window.open(u,'_blank','noopener'); return; }
    const W=Math.min(1000,screen.availWidth-80), H=Math.min(820,screen.availHeight-80), L=Math.max(0,screen.availWidth-W-40);
    const w=window.open('about:blank','readupPreview',`popup=yes,width=${W},height=${H},left=${L},top=40`);
    if(!w){ window.open(u,'_blank','noopener'); return; }
    try{ w.opener=null; }catch(e){} w.location.href=u; w.focus();
  }
  document.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey) return;
    const a=e.target.closest&&e.target.closest('a[href]'); if(!a||a.closest('#reader')) return;
    if(!/^https?:\/\//i.test(a.getAttribute('href')||'')) return;
    e.preventDefault(); popLink(a.href);
  },true);
})();
