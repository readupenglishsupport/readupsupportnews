/* Chạy sớm trong <head> để tránh nháy giao diện: áp cỡ chữ + theme đã lưu */
try{const f=localStorage.getItem('fs');if(f)document.documentElement.style.setProperty('--rf',f+'rem')}catch(e){}
try{const s=localStorage.getItem('theme');document.documentElement.dataset.bsTheme=s||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light')}catch(e){}
