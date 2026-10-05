/* XENDER THEME CONTROL */
(()=> {
  const saved=localStorage.getItem("xs-theme");
  if(saved==="dark")document.documentElement.dataset.theme="dark";
  else document.documentElement.removeAttribute("data-theme");
  const mount=()=>{
    const header=document.querySelector("header");if(!header||document.getElementById("xsThemeToggle"))return;
    const b=document.createElement("button");b.id="xsThemeToggle";b.className="xs-theme-toggle";b.type="button";
    const paint=()=>{const dark=document.documentElement.dataset.theme==="dark";b.innerHTML=dark?"☀️ <span>Light</span>":"🌙 <span>Dark</span>";b.setAttribute("aria-label",dark?"Switch to light mode":"Switch to dark mode")};
    b.onclick=()=>{const dark=document.documentElement.dataset.theme==="dark";if(dark){document.documentElement.removeAttribute("data-theme");localStorage.setItem("xs-theme","light")}else{document.documentElement.dataset.theme="dark";localStorage.setItem("xs-theme","dark")}paint()};
    const nav=header.querySelector("nav"),desktop=header.querySelector(".desktop");
    if(desktop)header.insertBefore(b,desktop);else if(nav)header.insertBefore(b,nav);else header.appendChild(b);
    paint();
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});else mount();
})();
document.getElementById('menu')?.addEventListener('click',()=>document.querySelector('nav')?.classList.toggle('open'));document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('nav')?.classList.remove('open')));;document.querySelectorAll('.filter[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.filter[data-filter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const filter=btn.dataset.filter;document.querySelectorAll('.catalog-products .product-card[data-category]').forEach(card=>card.classList.toggle('hidden',filter!=='all'&&card.dataset.category!==filter));}));
;(()=> {
  if(document.getElementById('xsChat')) return;
  const shell=document.createElement('div');
  shell.id='xsChat';
  shell.innerHTML=`
    <button class="xs-chat-fab" id="xsChatFab" aria-label="Open Xender Assistant">
      <span class="xs-chat-dot"></span><span>Chat</span>
    </button>
    <section class="xs-chat-panel" id="xsChatPanel" aria-hidden="true">
      <div class="xs-chat-head">
        <div><strong>Xender Assistant</strong><small><i></i> Online · automated helper</small></div>
        <button id="xsChatClose" aria-label="Close chat">×</button>
      </div>
      <div class="xs-chat-messages" id="xsChatMessages">
        <div class="xs-msg bot">Hi 👋 Main Xender Secrets assistant hoon. Shop, websites, novels ya custom project ke baare mein pooch sakte ho.</div>
      </div>
      <div class="xs-chat-quick" id="xsChatQuick">
        <button data-q="Show shop products">🛍 Shop</button>
        <button data-q="I need a website">💻 Website</button>
        <button data-q="Show completed novels">📚 Novels</button>
        <button data-q="Open the community">👥 Community</button>
        <button data-q="How can I contact you?">💬 Contact</button>
      </div>
      <form class="xs-chat-form" id="xsChatForm">
        <input id="xsChatInput" autocomplete="off" maxlength="500" placeholder="Type your message…" aria-label="Chat message">
        <button type="submit" aria-label="Send">➤</button>
      </form>
    </section>`;
  document.body.appendChild(shell);

  const fab=document.getElementById('xsChatFab');
  const panel=document.getElementById('xsChatPanel');
  const close=document.getElementById('xsChatClose');
  const form=document.getElementById('xsChatForm');
  const input=document.getElementById('xsChatInput');
  const msgs=document.getElementById('xsChatMessages');
  const quick=document.getElementById('xsChatQuick');

  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const add=(text,type='bot',actions=[])=>{
    const row=document.createElement('div');
    row.className='xs-msg '+type;
    row.innerHTML=esc(text).replace(/\n/g,'<br>');
    msgs.appendChild(row);
    if(actions.length){
      const a=document.createElement('div'); a.className='xs-chat-actions';
      actions.forEach(x=>{
        const el=document.createElement('a');
        el.href=x.href; el.textContent=x.label;
        if(/^https?:\/\//.test(x.href)){el.target='_blank';el.rel='noopener'}
        a.appendChild(el);
      });
      msgs.appendChild(a);
    }
    msgs.scrollTop=msgs.scrollHeight;
  };
  const setOpen=v=>{
    panel.classList.toggle('open',v);
    panel.setAttribute('aria-hidden',String(!v));
    if(v) setTimeout(()=>input.focus(),150);
  };
  fab.onclick=()=>setOpen(true);
  close.onclick=()=>setOpen(false);

  async function ask(q){
    if(!q.trim())return;
    add(q,'user'); input.value='';
    const typing=document.createElement('div');typing.className='xs-msg bot typing';typing.textContent='Typing…';msgs.appendChild(typing);msgs.scrollTop=msgs.scrollHeight;
    try{
      const r=await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:q,page:location.pathname})});
      const j=await r.json(); typing.remove();
      add(j.reply||'Sorry, mujhe iska answer nahi mila. WhatsApp par team se baat kar sakte ho.','bot',j.actions||[]);
    }catch(e){
      typing.remove();
      add('Connection issue aa gaya. Aap WhatsApp se directly contact kar sakte ho.','bot',[{label:'Open WhatsApp',href:'https://wa.me/919821941814'}]);
    }
  }
  form.onsubmit=e=>{e.preventDefault();ask(input.value)};
  quick.querySelectorAll('button').forEach(b=>b.onclick=()=>ask(b.dataset.q));
})();

;(()=>{async function accountLink(){const nav=document.querySelector('header nav');if(!nav)return;let a=nav.querySelector('.account-nav-link');if(!a){a=document.createElement('a');a.className='account-nav-link';a.href='/account.html';nav.appendChild(a)}a.textContent='Login / Register';try{const r=await fetch('/api/auth/me',{credentials:'same-origin'});if(r.ok){const j=await r.json();a.textContent='Account · '+String(j.user?.name||'User').split(' ')[0]}}catch{}}accountLink();window.addEventListener('xs-auth-changed',accountLink)})();
;(()=>{const nav=document.querySelector('header nav');if(nav&&!nav.querySelector('.community-nav-link')){const a=document.createElement('a');a.className='community-nav-link';a.href='/community.html';a.textContent='Community';const acct=nav.querySelector('.account-nav-link');acct?nav.insertBefore(a,acct):nav.appendChild(a)}})();
;(()=>{const m=location.pathname.match(/\/article-([^/]+)\.html$/);if(!m)return;const body=document.querySelector('.article-body');if(!body)return;const slug=m[1],box=document.createElement('div');box.className='article-engagement';box.innerHTML='<div><div class="kicker">ARTICLE ACTIVITY</div><strong>Was this useful?</strong><span id="articleStats">Loading…</span></div><div class="article-engagement-actions"><button id="articleLike">♥ Helpful</button><a href="/community.html">💬 Discuss</a><button id="articleShare">↗ Share</button></div>';body.appendChild(box);const stats=box.querySelector('#articleStats'),like=box.querySelector('#articleLike');async function load(){try{const r=await fetch('/api/engagement/'+encodeURIComponent(slug));const j=await r.json();if(j.stats)stats.textContent=j.stats.views+' views · '+j.stats.likes+' helpful'}catch{stats.textContent='Join the discussion in Community'}}load();like.onclick=async()=>{const r=await fetch('/api/engagement/'+encodeURIComponent(slug)+'/like',{method:'POST',credentials:'same-origin'});if(r.status===401){location.href='/account.html';return}const j=await r.json();if(j.stats){like.textContent=(j.liked?'♥ Helpful':'♡ Helpful');stats.textContent=j.stats.views+' views · '+j.stats.likes+' helpful'}};box.querySelector('#articleShare').onclick=async()=>{if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);box.querySelector('#articleShare').textContent='✓ Copied'}}})();
;(()=>{const box=document.querySelector('#communityFeedPreview');if(!box)return;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));fetch('/api/community/feed?sort=latest&limit=3').then(r=>r.json()).then(j=>{box.innerHTML=j.posts?.length?j.posts.map(p=>'<a href="/community.html?post='+encodeURIComponent(p.id)+'"><span>'+esc(p.category)+'</span><strong>'+esc(p.title)+'</strong><small>♥ '+p.likes+' · 💬 '+p.comments+' · ◉ '+p.views+'</small></a>').join(''):'<a href="/community.html" class="community-empty-card"><span>NEW COMMUNITY</span><strong>Start the first discussion</strong><small>Ask a useful question or share an idea →</small></a>'}).catch(()=>{box.innerHTML='<a href="/community.html" class="community-empty-card"><strong>Open Xender Community →</strong></a>'})})();

;(()=>{const fallback='https://t.me/+S0mWe81MlUpjNzQ1';fetch('/api/site-config').then(r=>r.json()).then(j=>{const candidate=String(j.telegramUrl||'');const u=/^https:\/\/t\.me\//i.test(candidate)?candidate:fallback;document.querySelectorAll('[data-telegram-link]').forEach(a=>{a.href=u;a.textContent='Xender Secrets';a.classList.remove('hidden')});document.querySelectorAll('[data-telegram-panel]').forEach(x=>x.classList.remove('hidden'))}).catch(()=>{document.querySelectorAll('[data-telegram-link]').forEach(a=>{a.href=fallback;a.textContent='Xender Secrets';a.classList.remove('hidden')});document.querySelectorAll('[data-telegram-panel]').forEach(x=>x.classList.remove('hidden'))})})();


;(()=> {
  const COUNTRY_OPTIONS=[
    ["","Auto-detect country"],["IN","India"],["US","United States"],["GB","United Kingdom"],["CA","Canada"],["AU","Australia"],["NZ","New Zealand"],
    ["AE","United Arab Emirates"],["SA","Saudi Arabia"],["QA","Qatar"],["KW","Kuwait"],["BH","Bahrain"],["OM","Oman"],["SG","Singapore"],["MY","Malaysia"],
    ["JP","Japan"],["CN","China"],["HK","Hong Kong"],["KR","South Korea"],["ID","Indonesia"],["TH","Thailand"],["PH","Philippines"],["VN","Vietnam"],
    ["BD","Bangladesh"],["PK","Pakistan"],["LK","Sri Lanka"],["NP","Nepal"],["DE","Germany"],["FR","France"],["NL","Netherlands"],["ES","Spain"],["IT","Italy"],
    ["IE","Ireland"],["PT","Portugal"],["CH","Switzerland"],["SE","Sweden"],["NO","Norway"],["DK","Denmark"],["PL","Poland"],["TR","Türkiye"],["ZA","South Africa"],
    ["NG","Nigeria"],["KE","Kenya"],["EG","Egypt"],["BR","Brazil"],["MX","Mexico"],["AR","Argentina"]
  ];
  const ZERO_DECIMAL=new Set(["JPY","KRW","IDR","VND","HUF","CLP","PYG"]);
  const state={country:"IN",detectedCountry:"IN",currency:"INR",rate:1,source:"base"};
  window.XSLocale=state;
  window.XSConvertINR=amount=>Number(amount||0)*Number(state.rate||1);
  window.XSFormatINR=amount=>{
    const value=window.XSConvertINR(amount);
    try{
      return new Intl.NumberFormat(undefined,{style:"currency",currency:state.currency,minimumFractionDigits:ZERO_DECIMAL.has(state.currency)?0:2,maximumFractionDigits:ZERO_DECIMAL.has(state.currency)?0:2}).format(value);
    }catch{return state.currency+" "+value.toFixed(2)}
  };
  const paint=()=>{
    document.querySelectorAll("[data-inr]").forEach(el=>{
      const n=Number(el.dataset.inr);
      if(!Number.isFinite(n))return;
      const prefix=el.dataset.pricePrefix||"";
      const suffix=el.dataset.priceSuffix||"";
      el.textContent=prefix+window.XSFormatINR(n)+suffix;
    });
    document.querySelectorAll("[data-currency-code]").forEach(el=>el.textContent=state.currency);
    window.dispatchEvent(new CustomEvent("xs-locale-changed",{detail:{...state}}));
  };
  const countryName=code=>{
    try{return new Intl.DisplayNames([navigator.language||"en"],{type:"region"}).of(code)||code}catch{return code}
  };
  const mount=()=>{
    const header=document.querySelector("header"); if(!header)return;
    const existing=document.getElementById("xsCountryPicker");
    if(existing)return {select:existing.querySelector("select"),meta:existing.querySelector(".xs-country-meta")};
    const wrap=document.createElement("div"); wrap.id="xsCountryPicker"; wrap.className="xs-country-picker";
    const select=document.createElement("select"); select.setAttribute("aria-label","Country and currency");
    COUNTRY_OPTIONS.forEach(([code,name])=>{const o=document.createElement("option");o.value=code;o.textContent=name;select.appendChild(o)});
    const saved=localStorage.getItem("xs-country")||""; select.value=COUNTRY_OPTIONS.some(x=>x[0]===saved)?saved:"";
    const meta=document.createElement("span"); meta.className="xs-country-meta"; meta.textContent="Detecting currency…";
    const credit=document.createElement("a");credit.href="https://www.exchangerate-api.com";credit.target="_blank";credit.rel="noopener";credit.textContent="FX";
    wrap.append(select,meta,credit);
    const anchor=header.querySelector(".desktop"); anchor?header.insertBefore(wrap,anchor):header.appendChild(wrap);
    select.onchange=()=>{localStorage.setItem("xs-country",select.value);load(select.value)};
    return {select,meta};
  };
  async function load(country){
    const ui=mount();
    try{
      const r=await fetch("/api/locale"+(country?"?country="+encodeURIComponent(country):""));
      const j=await r.json(); if(!r.ok||!j.ok)throw new Error("locale");
      Object.assign(state,j);
      if(ui){
        const shownCountry=countryName(j.country);
        ui.meta.textContent=shownCountry+" · "+j.currency;
        if(!country&&ui.select)ui.select.options[0].textContent="Auto: "+shownCountry+" ("+j.currency+")";
      }
    }catch{
      Object.assign(state,{country:"IN",detectedCountry:"IN",currency:"INR",rate:1,source:"fallback"});
      if(ui)ui.meta.textContent="India · INR";
    }
    paint();
  }
  const style=document.createElement("style");
  style.textContent=".xs-country-picker{display:flex;align-items:center;gap:6px;margin-left:auto;margin-right:10px;font-size:11px;white-space:nowrap}.xs-country-picker select{max-width:145px;background:#111827;color:#fff;border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:7px 9px;font:inherit}.xs-country-meta{opacity:.75}.xs-country-picker>a{font-size:9px;opacity:.45;color:inherit;text-decoration:none}@media(max-width:900px){.xs-country-picker{position:absolute;right:54px;top:17px;width:auto;margin:0;justify-content:flex-end}.xs-country-picker select{max-width:118px;padding:6px 8px}.xs-country-meta,.xs-country-picker>a{display:none}}";
  document.head.appendChild(style);
  mount();
  load(localStorage.getItem("xs-country")||"");
})();
