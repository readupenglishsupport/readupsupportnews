/* Ẩn / hiện thanh bên trên màn hình lớn (laptop, máy tính) để có thêm chỗ đọc PDF. Nhớ lựa chọn cho lần sau.
   Trên điện thoại / máy tính bảng thanh bên vẫn là ngăn kéo (nút ☰). */
(()=>{
  const h=document.documentElement, b=document.getElementById('sideToggle'); if(!b) return;
  const paint=()=>{ const off=h.classList.contains('side-off'); b.setAttribute('aria-pressed',String(off)); b.querySelector('i').className='bi fs-5 '+(off?'bi-layout-sidebar':'bi-layout-sidebar-inset'); };
  b.onclick=()=>{ h.classList.toggle('side-off'); try{ localStorage.setItem('sideOff',h.classList.contains('side-off')?'1':'0'); }catch(e){} paint(); window.dispatchEvent(new Event('resize')); };
  paint();
})();
