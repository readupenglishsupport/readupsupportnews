/* ===== Bổ sung: menu bên trái chỉ tô đỏ đúng mục đang ở ===== */
(()=>{
  let listPicked=false;               /* true khi bạn bấm Theo ngày / Yêu thích / một thư mục */
  const _se=showEmpty, _rs=renderSide;
  showEmpty=function(){ listPicked=false; return _se.apply(this,arguments); };   /* về trang chủ → Home đỏ */
  renderSide=function(){
    _rs.apply(this,arguments);
    const home=!cur&&!listPicked;
    $('#navHome').classList.toggle('on',home);
    if(home) document.querySelectorAll('#navAll,#navFav,#folderList .nav-item-x').forEach(n=>n.classList.remove('on'));
  };
  document.addEventListener('click',e=>{
    if(e.target.closest('#navAll,#navFav,#folderList [data-f]')&&!e.target.closest('[data-del]')) listPicked=true;
  },true);
})();
