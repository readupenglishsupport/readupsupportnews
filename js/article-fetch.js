/* ===== Bổ sung: nút Paste + tải bài báo có thêm nhiều lớp dự phòng ===== */
(()=>{
  const vi=()=>lang==='vi';
  $('#pasteBtn').onclick=async()=>{
    const inp=$('#urlIn'); let x='';
    try{ x=(await navigator.clipboard.readText()||'').trim(); }catch(e){}
    const m=x.match(/https?:\/\/\S+/i);
    if(m){ inp.value=m[0]; inp.focus(); return; }
    inp.focus(); toast(vi()?'Clipboard chưa có link. Hãy copy link rồi bấm Paste (hoặc nhấn Ctrl+V).':'No link in clipboard. Copy a link, then tap Paste (or press Ctrl+V).');
  };

  const _gh=getHTML;
  const feedish=u=>{ try{ const x=new URL(u); return x.pathname.length<=1||/(^|\/)(feed|rss|atom)|\.(xml|rss|atom)$/i.test(x.pathname); }catch(e){ return false; } };
  const textLen=h=>{ try{ const d=new DOMParser().parseFromString(h,'text/html'); d.querySelectorAll('script,style,noscript').forEach(n=>n.remove()); return ((d.body&&d.body.textContent)||'').replace(/\s+/g,' ').trim().length; }catch(e){ return 0; } };
  async function grab(url,ms){
    const c=new AbortController(), id=setTimeout(()=>c.abort(),ms||12000);
    try{ const r=await fetch(url,{signal:c.signal}); return r.ok?await r.text():''; }catch(e){ return ''; } finally{ clearTimeout(id); }
  }
  /* Jina trả markdown cho trang dựng bằng JavaScript → đổi thành HTML đơn giản để Readability đọc được */
  function md2html(md,u){
    let title=(md.match(/^Title:\s*(.*)$/m)||[])[1]||'';
    const k=md.indexOf('Markdown Content:'); if(k>-1) md=md.slice(k+17);
    const inl=x=>esc(x).replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g,'<img alt="$1" src="$2">').replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g,'<a href="$2">$1</a>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
    const body=md.split(/\n{2,}/).map(b=>b.trim()).filter(Boolean).map(b=>{
      const h=b.match(/^(#{1,4})\s+(.*)$/s); if(h) return `<h${h[1].length}>${inl(h[2])}</h${h[1].length}>`;
      if(/^[*-]\s/.test(b)) return '<ul>'+b.split('\n').map(l=>`<li>${inl(l.replace(/^[*-]\s+/,''))}</li>`).join('')+'</ul>';
      return `<p>${inl(b.replace(/\n/g,' '))}</p>`;
    }).join('');
    return `<html><head><title>${esc(title)}</title></head><body><article>${title?`<h1>${esc(title)}</h1>`:''}${body}</article></body></html>`;
  }
  getHTML=async function(u){
    let best='', err;
    try{ best=await _gh(u); }catch(e){ err=e; }
    if(feedish(u)){ if(best) return best; throw err; }
    if(best&&textLen(best)>=800) return best;
    const tries=[
      ()=>grab('https://corsproxy.io/?url='+encodeURIComponent(u)),
      ()=>grab('https://api.codetabs.com/v1/proxy?quest='+encodeURIComponent(u)),
      ()=>grab('https://web.archive.org/web/2id_/'+u,20000),
      async()=>{ const m=await grab('https://r.jina.ai/'+u,20000); return m.length>300?md2html(m,u):''; }
    ];
    for(const f of tries){
      const h=await f(); if(!h) continue;
      const n=textLen(h); if(n>=800) return h; if(n>textLen(best)) best=h;
    }
    if(best) return best;
    throw err||new Error(t('fetchFail'));
  };
})();
