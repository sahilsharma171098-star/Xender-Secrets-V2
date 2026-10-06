(() => {
  "use strict";
  const cfg = window.XENDER_ADS_CONFIG || {};
  const placements = [...document.querySelectorAll(".xs-ad-slot[data-ad-slot]")];
  if (!placements.length) return;

  const house = {
    "novels-top": {title:"Need a faster website?", text:"Xender SiteCheck finds SEO, mobile and conversion issues.", href:"/sitecheck", cta:"Check a site"},
    "novels-sidebar": {title:"Build your business online", text:"Mobile-first business websites by Xender Secrets.", href:"/services", cta:"View services"},
    "reader-bottom": {title:"Website losing enquiries?", text:"Get a free website check from Xender Secrets.", href:"/#start", cta:"Free check"}
  };

  function renderHouse(el){
    const key=el.dataset.adSlot, h=house[key]||house["reader-bottom"];
    el.innerHTML='<div class="xs-ad-frame"><span class="xs-ad-label">Xender offer</span><a class="xs-house-ad" href="'+h.href+'"><span class="xs-house-copy"><strong>'+h.title+'</strong><span>'+h.text+'</span></span><span class="xs-house-cta">'+h.cta+'</span></a></div>';
  }
  placements.forEach(renderHouse);

  const client=String(cfg.client||"").trim();
  if(!cfg.enabled || !/^ca-pub-\d+$/.test(client)) return;

  const script=document.createElement("script");
  script.async=true;
  script.crossOrigin="anonymous";
  script.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+encodeURIComponent(client);
  script.onload=()=>{
    placements.forEach(el=>{
      const key=el.dataset.adSlot, slot=String(cfg.slots?.[key]||"").trim();
      if(!slot) return;
      el.innerHTML='<span class="xs-ad-label">Advertisement</span>';
      const ins=document.createElement("ins");
      ins.className="adsbygoogle";
      ins.style.display="block";
      ins.dataset.adClient=client;
      ins.dataset.adSlot=slot;
      ins.dataset.adFormat="auto";
      ins.dataset.fullWidthResponsive="true";
      el.appendChild(ins);
      try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(_){}
    });
  };
  document.head.appendChild(script);
})();