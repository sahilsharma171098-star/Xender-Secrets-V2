/* XENDER HOME THEME CONTROL */
(()=> {
  const saved=localStorage.getItem("xs-theme");
  if(saved==="dark")document.documentElement.dataset.theme="dark";
  else document.documentElement.removeAttribute("data-theme");
  const mount=()=>{
    const row=document.querySelector(".header-inner");if(!row||document.getElementById("homeThemeToggle"))return;
    const b=document.createElement("button");b.id="homeThemeToggle";b.className="home-theme-toggle";b.type="button";
    const paint=()=>{const dark=document.documentElement.dataset.theme==="dark";b.innerHTML=dark?"☀️ <span>Light</span>":"🌙 <span>Dark</span>";b.setAttribute("aria-label",dark?"Switch to light mode":"Switch to dark mode")};
    b.onclick=()=>{const dark=document.documentElement.dataset.theme==="dark";if(dark){document.documentElement.removeAttribute("data-theme");localStorage.setItem("xs-theme","light")}else{document.documentElement.dataset.theme="dark";localStorage.setItem("xs-theme","dark")}paint()};
    const cta=row.querySelector(".header-cta");cta?row.insertBefore(b,cta):row.appendChild(b);paint();
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();

document.getElementById('menu')?.addEventListener('click',()=>document.getElementById('nav')?.classList.toggle('open'));
document.querySelectorAll('#nav a').forEach(a=>a.addEventListener('click',()=>document.getElementById('nav')?.classList.remove('open')));
