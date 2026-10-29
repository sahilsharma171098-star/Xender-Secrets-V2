/* Xender Secrets · HUD shell (XEND-HUD-001): story engine, readout, rail, header, menu, reveal, tabs.
 * Works with /xs/world.js (3D, optional) and leaves forms, offers and analytics to /xs-growth.js and
 * catalog filters/sharing to /portfolio.js. Without JS every chapter and section renders as static content. */
(function(){
  "use strict";
  var doc=document.documentElement;
  var cfgEl=document.getElementById("xs-page");
  var P=cfgEl?JSON.parse(cfgEl.textContent):{chapters:[]};
  var reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData=!!(navigator.connection&&navigator.connection.saveData);
  var XH=window.XH={S:0,reduce:reduce,ready:false,page:P,saveData:saveData};
  var lite=innerWidth<860||matchMedia("(pointer:coarse)").matches||(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;
  XH.lite=lite;
  doc.classList.add("xs-js");
  if(lite)doc.classList.add("lite");
  if(reduce||saveData)doc.classList.add("no-webgl");
  else doc.classList.add("js-reveal");
  var $=function(id){return document.getElementById(id);};

  /* reticle ticks + degree marks */
  (function(){
    var NS="http://www.w3.org/2000/svg",t=$("ticks"),d=$("degs");if(!t||!d)return;
    for(var i=0;i<120;i++){var a=i*3*Math.PI/180,maj=i%10===0,r1=maj?368:384,r2=400;
      var l=document.createElementNS(NS,"line");
      l.setAttribute("x1",(500+Math.sin(a)*r1).toFixed(1));l.setAttribute("y1",(500-Math.cos(a)*r1).toFixed(1));
      l.setAttribute("x2",(500+Math.sin(a)*r2).toFixed(1));l.setAttribute("y2",(500-Math.cos(a)*r2).toFixed(1));
      l.setAttribute("stroke-width",maj?"2":"1");t.appendChild(l);}
    for(var k=0;k<12;k++){var b=k*30*Math.PI/180,tx=document.createElementNS(NS,"text");
      tx.setAttribute("x",(500+Math.sin(b)*432).toFixed(1));tx.setAttribute("y",(505-Math.cos(b)*432).toFixed(1));
      tx.textContent=("00"+k*30).slice(-3);d.appendChild(tx);}
  })();

  /* ---------- story geometry ---------- */
  var secs=[].slice.call(document.querySelectorAll(".ch"));
  var NCH=secs.length;
  var paperEl=document.querySelector(".paper")||$("foot");
  var tracks=[].slice.call(document.querySelectorAll("[data-drift]")).map(function(el){return{el:el,ch:+el.closest(".ch").dataset.ch,span:0,w:""};});
  var geo=[],vh=innerHeight,bodyTop=0,footTop=0,maxY=0,dirty=true;
  function measure(){
    vh=innerHeight;
    geo=secs.map(function(s){var r=s.getBoundingClientRect();return{top:r.top+scrollY,h:r.height};});
    bodyTop=paperEl?paperEl.getBoundingClientRect().top+scrollY:0;
    footTop=$("foot")?$("foot").getBoundingClientRect().top+scrollY:0;
    maxY=doc.scrollHeight-vh;
    tracks.forEach(function(t){t.span=Math.max(0,t.el.scrollWidth-t.el.parentNode.clientWidth);});
    dirty=true;
  }
  function storyAt(y){
    for(var i=0;i<NCH;i++){
      var g=geo[i];
      if(y<g.top+g.h){
        var stuck=Math.max(1,g.h-vh),dy=y-g.top;
        if(dy<=stuck)return i+0.75*Math.max(0,dy/stuck);
        return i+0.75+0.25*Math.min(1,(dy-stuck)/vh);
      }
    }
    return NCH;
  }
  function scrollForS(s){
    if(!NCH)return 0;
    var i=Math.min(NCH-1,Math.floor(s)),f=s-i,g=geo[i],stuck=Math.max(1,g.h-vh);
    return f<=0.75?g.top+stuck*(f/0.75):g.top+stuck+vh*((f-0.75)/0.25);
  }
  XH.scrollForS=scrollForS;XH.nch=NCH;XH.measure=measure;
  measure();
  addEventListener("resize",measure);
  addEventListener("load",measure);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(measure);
  /* filters, tabs, FAQ answers and the lead-success box change the page height */
  if("ResizeObserver" in window&&paperEl){var rz=0;new ResizeObserver(function(){cancelAnimationFrame(rz);rz=requestAnimationFrame(measure);}).observe(paperEl);}

  /* ring index shared with the 3D world */
  var ringCh=-1;(P.chapters||[]).forEach(function(c,i){if(c.scene==="ring"&&ringCh<0)ringCh=i;});
  var NP=(P.panels||[]).length;
  XH.ringIndex=function(s){if(ringCh<0||NP<2)return 0;var u=(s-ringCh)/0.75;u=Math.max(0,Math.min(1,u));return Math.round(u*(NP-1));};

  /* ---------- reveal ---------- */
  if(!reduce&&!saveData&&"IntersectionObserver" in window){
    var rv=[].slice.call(document.querySelectorAll("[data-reveal]"));
    rv.forEach(function(el){var r=el.getBoundingClientRect();if(r.top>innerHeight*0.98)el.classList.add("pre");});
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.remove("pre");io.unobserve(e.target);}});},{rootMargin:"0px 0px -6% 0px"});
    rv.forEach(function(el){io.observe(el);});
  }

  /* ---------- typed readout: page facts only ---------- */
  var dots=function(l,v){var s=l+" ";while(s.length<15)s+=".";return s+" <em>"+v+"</em>";};
  var roCode=$("roCode"),roLines=$("roLines"),roEl=$("ro"),typeTimer=null,lastCh=-1;
  var escT=function(s){return String(s).replace(/[&<>]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;"}[c];});};
  function typeRO(ch){
    if(!roCode||!NCH)return;
    clearTimeout(typeTimer);
    var c=P.chapters[Math.min(ch,NCH-1)];roCode.textContent=c.code||"";roLines.innerHTML="";
    var rows=(c.lines||[]).map(function(pair){var h=dots(escT(pair[0]),escT(pair[1]));var d=document.createElement("div");d.className="ln";roLines.appendChild(d);return{el:d,html:h,plain:h.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")};});
    if(reduce){rows.forEach(function(r){r.el.innerHTML=r.html;});return;}
    var ri=0,ci=0;
    (function step(){
      if(ri>=rows.length)return;
      var r=rows[ri];ci+=2;
      if(ci>=r.plain.length){r.el.innerHTML=r.html;ri++;ci=0;typeTimer=setTimeout(step,70);}
      else{r.el.textContent=r.plain.slice(0,ci)+"▌";typeTimer=setTimeout(step,14);}
    })();
  }
  function ticks(n){var lines=roLines.children;for(var i=0;i<lines.length;i++){var em=lines[i].querySelector("em");if(em){var v=i<n?"✓ Done":"—";if(em.textContent!==v)em.textContent=v;}}}

  /* boot log (first page of a visit only) */
  var boot=$("bootlog");
  var seen=false;try{seen=sessionStorage.getItem("xs-boot")==="1";sessionStorage.setItem("xs-boot","1");}catch(e){}
  if(boot){
    if(!reduce&&!seen&&P.boot){
      var BL=P.boot,bi=0,bc=0,out="";
      (function bstep(){
        if(bi>=BL.length){setTimeout(function(){boot.classList.add("done");},2600);return;}
        bc+=2;var line=BL[bi];
        if(bc>=line.length){out+=line+"\n";bi++;bc=0;boot.textContent=out;setTimeout(bstep,120);}
        else{boot.textContent=out+line.slice(0,bc)+"▌";setTimeout(bstep,16);}
      })();
    }else boot.hidden=true;
  }

  /* ---------- shell elements ---------- */
  var railBtns=[].slice.call(document.querySelectorAll(".rail button"));
  var hudN=$("hudN"),hudT=$("hudT"),top=$("top"),prog=$("progress"),rail=$("rail"),hud=$("hud"),hud2d=$("hud2d");
  var ringLis=[].slice.call(document.querySelectorAll("[data-ring-list] li"));
  var ringCard=document.querySelector("[data-ring-card]");
  var word=$("word"),cur=$("cursor"),waf=document.querySelector(".wa-float");
  railBtns.forEach(function(b){b.addEventListener("click",function(){
    var c=+b.dataset.go;window.scrollTo({top:c===0?0:scrollForS(c+0.02)+2,behavior:reduce?"auto":"smooth"});
  });});
  [].slice.call(document.querySelectorAll("[data-ring-list] a")).forEach(function(a){
    a.addEventListener("focus",function(){if(doc.classList.contains("no-webgl"))return;var k=+a.dataset.k;var y=scrollForS(ringCh+0.75*(k/Math.max(1,NP-1)));if(Math.abs(scrollY-y)>40)window.scrollTo({top:y,behavior:"auto"});});
  });
  setTimeout(function(){hud2d&&hud2d.classList.remove("boot");},3200);
  var curOn=!!cur&&!reduce&&matchMedia("(pointer:fine)").matches,cx=-100,cy=-100,tx=-100,ty=-100;
  if(curOn){
    addEventListener("pointermove",function(e){tx=e.clientX;ty=e.clientY;},{passive:true});
    document.addEventListener("pointerover",function(e){cur.classList.toggle("big",!!(e.target.closest&&e.target.closest("a,button,summary")));});
  }
  var lastY=-1,lastK=-1,wProg="",wRise="";
  function setOff(el,v){if(el)el.classList.toggle("off",v);}
  function scrollWork(y){
    var s=storyAt(y);XH.S=s;XH.covered=y>=bodyTop-2;
    if(boot&&s>0.3&&!boot.classList.contains("done"))boot.classList.add("done");
    var ch=Math.max(0,Math.min(NCH-1,Math.floor(s+0.25)));
    if(NCH&&ch!==lastCh){
      lastCh=ch;
      railBtns.forEach(function(b,i){if(i===ch)b.setAttribute("aria-current","step");else b.removeAttribute("aria-current");});
      if(hudN){hudN.textContent=("0"+ch).slice(-2);hudT.textContent=P.chapters[ch].name;}
      typeRO(ch);
    }
    var cc=P.chapters[ch];
    if(cc&&cc.ticks&&geo[ch]){var g=geo[ch];var u=Math.max(0,Math.min(1,(y-g.top)/Math.max(1,g.h-vh)));ticks(Math.min(cc.lines.length,Math.floor(u*(cc.lines.length+0.6))));}
    if(ringCh>=0){
      var k=XH.ringIndex(s);
      if(k!==lastK){lastK=k;
        ringLis.forEach(function(li,i){li.classList.toggle("on",i===k);});
        if(ringCard&&P.panels[k]){var pp=P.panels[k];
          ringCard.querySelector("[data-f=idx]").textContent=("0"+(k+1)).slice(-2)+" / "+("0"+NP).slice(-2);
          ringCard.querySelector("[data-f=name]").textContent=pp.name;
          var bd=ringCard.querySelector("[data-f=badge]");bd.textContent=pp.badge;bd.classList.toggle("live",pp.badge!=="Concept demo");
          ringCard.querySelector("[data-f=one]").textContent=pp.one||"";
          var go=ringCard.querySelector("[data-f=go]");go.href=pp.href;go.textContent=pp.cta||"Open live demo ↗";}
      }
    }
    var light=y+68>bodyTop;
    if(top){top.classList.toggle("light",light);top.classList.toggle("solid",y>40&&!light);}
    var pv="scaleX("+(maxY>0?Math.min(1,y/maxY):0).toFixed(3)+")";if(prog&&pv!==wProg){wProg=pv;prog.style.transform=pv;}
    var off=y+vh*0.5>bodyTop;
    setOff(rail,off);setOff(hud,off);setOff(roEl,off);setOff(hud2d,off);if(waf)waf.classList.toggle("on",off);
    tracks.forEach(function(t){var g=geo[t.ch];if(!g)return;var u=Math.max(0,Math.min(1,(y-g.top)/Math.max(1,g.h-vh)));var tv="translate3d("+(-u*t.span).toFixed(0)+"px,0,0)";if(tv!==t.w){t.w=tv;t.el.style.transform=tv;}});
    if(word){var fr=(y+vh-footTop)/Math.max(1,vh);var rise=Math.max(0,Math.min(1,fr));
      var rv2=((1-rise)*45).toFixed(1)+"%";if(rv2!==wRise){wRise=rv2;word.style.setProperty("--rise",rv2);}}
  }
  function frame(){
    var y=scrollY;
    if(y!==lastY||dirty){lastY=y;dirty=false;scrollWork(y);}
    if(curOn&&(Math.abs(tx-cx)>0.3||Math.abs(ty-cy)>0.3)){cx+=(tx-cx)*0.2;cy+=(ty-cy)*0.2;cur.style.transform="translate3d("+cx.toFixed(1)+"px,"+cy.toFixed(1)+"px,0)";cur.classList.toggle("on",tx>0&&ty+lastY<bodyTop);}
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- menu: #menu toggles the #nav overlay ---------- */
  var nav=$("nav"),mo=$("menu"),mc=$("menuClose");
  function setMenu(open){
    if(!nav||!mo)return;
    nav.classList.toggle("open",open);
    mo.setAttribute("aria-expanded",open?"true":"false");
    mo.setAttribute("aria-label",open?"Close menu":"Open menu");
    doc.classList.toggle("menu-open",open);
    if(open&&mc)mc.focus();
  }
  if(nav&&mo){
    mo.addEventListener("click",function(){setMenu(!nav.classList.contains("open"));});
    if(mc)mc.addEventListener("click",function(){setMenu(false);mo.focus();});
    addEventListener("keydown",function(e){if(e.key==="Escape"&&nav.classList.contains("open")){setMenu(false);mo.focus();}});
    [].slice.call(nav.querySelectorAll("a")).forEach(function(a){a.addEventListener("click",function(){setMenu(false);});});
  }

  /* ---------- magnetic buttons ---------- */
  if(!reduce&&matchMedia("(pointer:fine)").matches){
    [].slice.call(document.querySelectorAll(".mag")).forEach(function(b){
      b.addEventListener("pointermove",function(e){var r=b.getBoundingClientRect();
        var dx=(e.clientX-(r.left+r.width/2))*0.18,dy=(e.clientY-(r.top+r.height/2))*0.3;
        b.style.setProperty("--mx",Math.max(-8,Math.min(8,dx)).toFixed(1)+"px");b.style.setProperty("--my",Math.max(-8,Math.min(8,dy)).toFixed(1)+"px");});
      b.addEventListener("pointerleave",function(){b.style.setProperty("--mx","0px");b.style.setProperty("--my","0px");});
    });
  }

  /* ---------- tabs ---------- */
  [].slice.call(document.querySelectorAll("[role=tablist]")).forEach(function(tl){
    var tabs=[].slice.call(tl.querySelectorAll("[role=tab]"));
    function sel(t){tabs.forEach(function(x){var on=x===t;x.setAttribute("aria-selected",on?"true":"false");x.tabIndex=on?0:-1;var pn=$(x.getAttribute("aria-controls"));if(pn)pn.hidden=!on;});}
    tabs.forEach(function(t,i){t.addEventListener("click",function(){sel(t);});t.addEventListener("keydown",function(e){var d=e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0;if(d){var n=tabs[(i+d+tabs.length)%tabs.length];n.focus();sel(n);}});});
  });

  /* ---------- international visitors: show the US$299 anchor instead of the ₹ packages (as home.js) ---------- */
  var notes=document.querySelectorAll("[data-intl-note]");
  if(notes.length&&window.fetch){
    var saved="";try{saved=localStorage.getItem("xs-country")||"";}catch(e){}
    fetch("/api/locale"+(/^[A-Z]{2}$/.test(saved)?"?country="+saved:"")).then(function(r){return r.ok?r.json():null;})
      .then(function(j){if(j&&j.ok&&j.country&&j.country!=="IN")[].forEach.call(notes,function(n){n.hidden=false;});}).catch(function(){});
  }

  /* ---------- thumbnails that fail fall back to a typographic cover ---------- */
  [].slice.call(document.querySelectorAll("img[data-fallback]")).forEach(function(img){
    var fail=function(){if(img.parentNode)img.parentNode.classList.add("nothumb");img.remove();};
    if(img.complete&&img.naturalWidth===0&&img.src)fail();else img.addEventListener("error",fail);
  });
})();
