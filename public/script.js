document.getElementById('menu').addEventListener('click',()=>document.querySelector('nav').classList.toggle('open'));document.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>document.querySelector('nav').classList.remove('open')));;document.querySelectorAll('.filter[data-filter]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.filter[data-filter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const filter=btn.dataset.filter;document.querySelectorAll('.catalog-products .product-card[data-category]').forEach(card=>card.classList.toggle('hidden',filter!=='all'&&card.dataset.category!==filter));}));
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
      add('Connection issue aa gaya. Aap WhatsApp se directly contact kar sakte ho.','bot',[{label:'Open WhatsApp',href:'https://wa.me/918368495854'}]);
    }
  }
  form.onsubmit=e=>{e.preventDefault();ask(input.value)};
  quick.querySelectorAll('button').forEach(b=>b.onclick=()=>ask(b.dataset.q));
})();

;(()=>{function accountLink(){const nav=document.querySelector('header nav');if(!nav||nav.querySelector('.account-nav-link'))return;const a=document.createElement('a');a.className='account-nav-link';a.href='/account.html';const user=JSON.parse(localStorage.getItem('xs-demo-user')||'null'),session=JSON.parse(localStorage.getItem('xs-demo-session')||'null');a.textContent=user&&session&&user.email===session.email?'Account · '+String(user.name||'User').split(' ')[0]:'Login / Register';nav.appendChild(a)}accountLink();window.addEventListener('xs-auth-changed',()=>{const a=document.querySelector('.account-nav-link');if(a)a.remove();accountLink()})})();