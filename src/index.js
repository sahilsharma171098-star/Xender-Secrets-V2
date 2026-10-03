const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});


const enc=new TextEncoder();
const AUTH_COOKIE="xs_session";
const SESSION_MAX_AGE=60*60*24*30;

const b64=bytes=>{let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)};
const fromB64=s=>{const raw=atob(s);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out};
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
const randomB64=n=>b64(crypto.getRandomValues(new Uint8Array(n)));
const randomToken=()=>randomB64(32).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const sha256=async value=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value))));
const passwordHash=async(password,saltB64)=>{
  const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:fromB64(saltB64),iterations:150000,hash:"SHA-256"},key,256);
  return b64(new Uint8Array(bits));
};
const cookieValue=(header,name)=>{
  if(!header)return null;
  for(const part of header.split(";")){const [k,...v]=part.trim().split("=");if(k===name)return decodeURIComponent(v.join("="))}
  return null;
};
const sessionCookie=token=>AUTH_COOKIE+"="+encodeURIComponent(token)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+SESSION_MAX_AGE;
const clearSessionCookie=()=>AUTH_COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
const authJson=(data,status=200,cookie)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...(cookie?{"set-cookie":cookie}:{})}});
const validEmail=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
async function createSession(DB,userId){
  const token=randomToken(),tokenHash=await sha256(token),now=new Date(),expires=new Date(now.getTime()+SESSION_MAX_AGE*1000);
  await DB.prepare("INSERT INTO sessions (id,user_id,token_hash,created_at,expires_at) VALUES (?,?,?,?,?)")
    .bind(crypto.randomUUID(),userId,tokenHash,now.toISOString(),expires.toISOString()).run();
  return token;
}
async function getSessionUser(request,DB){
  const token=cookieValue(request.headers.get("Cookie"),AUTH_COOKIE);
  if(!token)return null;
  const tokenHash=await sha256(token),now=new Date().toISOString();
  return DB.prepare("SELECT u.id,u.name,u.email,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?")
    .bind(tokenHash,now).first();
}

const products=[
  {id:"p1",name:"Cable Organizer Clips",category:"Desk & Cable",price:149,rating:4.6},
  {id:"p2",name:"Foldable Phone Stand",category:"Mobile",price:199,rating:4.5},
  {id:"p3",name:"Travel Organizer Pouch",category:"Travel",price:249,rating:4.7}
];

const storeProducts=[
  {id:"cable-organizer",name:"Cable Organizer Clips — 6 Pack",category:"desk",price:149},
  {id:"dustbin-bags",name:"Multipurpose Dustbin Bags",category:"home",price:129},
  {id:"phone-stand",name:"Foldable Phone Stand",category:"mobile",price:199},
  {id:"microfiber",name:"Microfiber Cleaning Cloth — 4 Pack",category:"home",price:179},
  {id:"utility-hooks",name:"Self-Adhesive Utility Hooks",category:"storage",price:159},
  {id:"travel-pouch",name:"Compact Travel Organizer Pouch",category:"travel",price:249},
  {id:"cable-ties",name:"Reusable Cable Ties — 10 Pack",category:"desk",price:119},
  {id:"storage-basket",name:"Mini Desk Storage Basket",category:"storage",price:229},
  {id:"cable-protectors",name:"Cable Protector Sleeves — 4 Pack",category:"mobile",price:99}
];

const tasks=[
  {id:1,title:"Finalize homepage copy",status:"Done",owner:"Aarav"},
  {id:2,title:"Review campaign dashboard",status:"In progress",owner:"Mira"},
  {id:3,title:"Prepare client handoff",status:"Todo",owner:"Kabir"}
];

export default {
  async fetch(request,env){
    const url=new URL(request.url);
    const path=url.pathname;
    const method=request.method.toUpperCase();



    if(path==="/api/auth/status" && method==="GET") return authJson({ok:true,available:Boolean(env.DB),mode:env.DB?"d1":"demo"});

    if(path==="/api/auth/register" && method==="POST"){
      if(!env.DB) return authJson({ok:false,setupRequired:true,error:"Secure account database is not connected yet."},503);
      const origin=request.headers.get("Origin"); if(origin && origin!==url.origin) return authJson({ok:false,error:"Invalid origin"},403);
      const body=await request.json().catch(()=>({}));
      const name=String(body.name||"").trim().slice(0,60);
      const email=String(body.email||"").trim().toLowerCase().slice(0,254);
      const password=String(body.password||"");
      if(name.length<2) return authJson({ok:false,error:"Enter your full name."},400);
      if(!validEmail(email)) return authJson({ok:false,error:"Enter a valid email address."},400);
      if(password.length<8 || password.length>128) return authJson({ok:false,error:"Password must be 8–128 characters."},400);
      const exists=await env.DB.prepare("SELECT id FROM users WHERE email=?").bind(email).first();
      if(exists) return authJson({ok:false,error:"An account with this email already exists."},409);
      const salt=randomB64(16),hash=await passwordHash(password,salt),id=crypto.randomUUID(),now=new Date().toISOString();
      try{
        await env.DB.prepare("INSERT INTO users (id,name,email,password_hash,password_salt,created_at,updated_at) VALUES (?,?,?,?,?,?,?)")
          .bind(id,name,email,hash,salt,now,now).run();
      }catch(e){
        if(String(e).toLowerCase().includes("unique")) return authJson({ok:false,error:"An account with this email already exists."},409);
        throw e;
      }
      const token=await createSession(env.DB,id);
      return authJson({ok:true,user:{id,name,email,created_at:now}},201,sessionCookie(token));
    }

    if(path==="/api/auth/login" && method==="POST"){
      if(!env.DB) return authJson({ok:false,setupRequired:true,error:"Secure account database is not connected yet."},503);
      const origin=request.headers.get("Origin"); if(origin && origin!==url.origin) return authJson({ok:false,error:"Invalid origin"},403);
      const body=await request.json().catch(()=>({}));
      const email=String(body.email||"").trim().toLowerCase().slice(0,254),password=String(body.password||"");
      const user=await env.DB.prepare("SELECT id,name,email,password_hash,password_salt,created_at FROM users WHERE email=?").bind(email).first();
      if(!user) return authJson({ok:false,error:"Email or password is incorrect."},401);
      const candidate=await passwordHash(password,user.password_salt);
      if(candidate!==user.password_hash) return authJson({ok:false,error:"Email or password is incorrect."},401);
      const token=await createSession(env.DB,user.id);
      return authJson({ok:true,user:{id:user.id,name:user.name,email:user.email,created_at:user.created_at}},200,sessionCookie(token));
    }

    if(path==="/api/auth/me" && method==="GET"){
      if(!env.DB) return authJson({ok:false,setupRequired:true,error:"Secure account database is not connected yet."},503);
      const user=await getSessionUser(request,env.DB);
      if(!user) return authJson({ok:false,error:"Not signed in."},401);
      return authJson({ok:true,user});
    }

    if(path==="/api/auth/logout" && method==="POST"){
      if(env.DB){
        const token=cookieValue(request.headers.get("Cookie"),AUTH_COOKIE);
        if(token){const tokenHash=await sha256(token);await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(tokenHash).run()}
      }
      return authJson({ok:true},200,clearSessionCookie());
    }

    if(path==="/api/chat" && method==="POST"){
      const body=await request.json().catch(()=>({}));
      const raw=String(body.message||"").trim();
      if(!raw) return json({ok:false,error:"message is required"},400);
      const q=raw.toLowerCase();
      let reply="Main Xender Secrets ke shop, website-development demos, novels, digital products aur contact options ke baare mein help kar sakta hoon.";
      let actions=[
        {label:"Explore categories",href:"/#explore"},
        {label:"Contact us",href:"/contact.html"}
      ];

      if(/shop|product|buy|cart|ecommerce|e-commerce|price|shopping/.test(q)){
        reply="Hamare Ecommerce Shop mein demo products, search, filters, cart aur checkout flow available hai. Abhi products/sample prices demo hain; real inventory connect hone par actual purchase links add kiye jayenge.";
        actions=[{label:"Open Shop",href:"/catalog.html"}];
      } else if(/website|web site|frontend|front end|backend|back end|full.?stack|developer|development|landing page|api/.test(q)){
        reply="Website Development catalog mein Frontend, Backend/API aur Full-Stack ke 9 interactive demos hain. Custom project ke liye scope discuss karke build customize kiya ja sakta hai.";
        actions=[{label:"Website Catalog",href:"/website-catalog.html"},{label:"Discuss Project",href:"https://wa.me/918368495854?text=Hi%20Xender%20Secrets%2C%20I%20want%20to%20discuss%20a%20website%20project."}];
      } else if(/novel|book|read|chinese|china|story|stories/.test(q)){
        reply="Completed Novels library mein world classics aur Chinese classics dono hain. Reading links original Project Gutenberg sources par open hote hain.";
        actions=[{label:"Browse Novels",href:"/novels.html"}];
      } else if(/prompt|tracker|digital product|workflow|template|ai tool/.test(q)){
        reply="Digital Products section mein Sales Trackers, Prompt Packs aur Workflow Templates ke sample categories hain. Custom versions business use-case ke hisaab se ban sakte hain.";
        actions=[{label:"Digital Products",href:"/#products"},{label:"Ask on WhatsApp",href:"https://wa.me/918368495854"}];
      } else if(/lead|sales|customer|cx|research|service/.test(q)){
        reply="Services mein Website & Landing Pages, Lead Generation & Research, Sales/CX Support aur AI-assisted workflows included hain.";
        actions=[{label:"View Services",href:"/#services"},{label:"Start Enquiry",href:"https://wa.me/918368495854"}];
      } else if(/contact|whatsapp|email|call|talk|human|person|support/.test(q)){
        reply="Aap Xender Secrets ko WhatsApp ya email se contact kar sakte ho. Fastest option WhatsApp hai.";
        actions=[{label:"WhatsApp",href:"https://wa.me/918368495854"},{label:"Contact Page",href:"/contact.html"},{label:"Email",href:"mailto:Sahilsharma171098@gmail.com"}];
      } else if(/account|register|registration|login|log in|sign in|sign up|profile/.test(q)){
        reply="Account page par demo registration, login, profile aur logout flow available hai. Abhi account sirf isi browser mein locally store hota hai, isliye real password use mat karein. Production customer accounts ke liye persistent database/auth provider connect karna hoga.";
        actions=[{label:"Login / Register",href:"/account.html"}];
      } else if(/refund|return|policy|privacy|terms/.test(q)){
        reply="Legal aur policy pages website par available hain. Refund terms project/product-specific conditions par depend karte hain.";
        actions=[{label:"Refunds",href:"/refund.html"},{label:"Privacy",href:"/privacy.html"},{label:"Terms",href:"/terms.html"}];
      } else if(/gst|company|founder|who are you|about/.test(q)){
        reply="Xender Secrets is a digital products and services brand founded by Sahil Kumar Sharma in India. Business and contact details website ke Contact page par listed hain.";
        actions=[{label:"Contact / Business Details",href:"/contact.html"}];
      } else if(/hello|hi|hey|namaste|hii|hlo/.test(q)){
        reply="Hi 👋 Kaise help karun? Aap Shop, Website Development, Novels, Digital Products ya Custom Project ke baare mein pooch sakte ho.";
        actions=[{label:"All Categories",href:"/#explore"}];
      }
      return json({ok:true,reply,actions});
    }

    if(path==="/api/health") return json({ok:true,service:"Xender Secrets demo API",time:new Date().toISOString()});

    if(path==="/api/catalog" && method==="GET") return json({
      ok:true,
      categories:["Frontend","Backend / API","Full Stack"],
      demos:9,
      note:"Demo catalog API. Sample data only."
    });

    if(path==="/api/products" && method==="GET") return json({ok:true,products});


    if(path==="/api/store/products" && method==="GET") return json({ok:true,products:storeProducts,note:"Demo inventory only."});

    if(path==="/api/store/checkout" && method==="POST"){
      const body=await request.json().catch(()=>({}));
      const items=Array.isArray(body.items)?body.items:[];
      const customer=body.customer||{};
      if(!items.length) return json({ok:false,error:"Cart is empty"},400);
      if(!customer.name || !customer.email || !customer.phone || !customer.pincode || !customer.address || !customer.payment) return json({ok:false,error:"Complete all checkout fields"},400);
      let subtotal=0;
      for(const line of items){
        const product=storeProducts.find(p=>p.id===line.id);
        const qty=Math.max(1,Math.min(10,Number(line.qty)||1));
        if(!product) return json({ok:false,error:"Unknown product in cart"},400);
        subtotal+=product.price*qty;
      }
      const shipping=subtotal>=499?0:49;
      return json({
        ok:true,
        orderId:"XS-DEMO-"+crypto.randomUUID().slice(0,8).toUpperCase(),
        subtotal,shipping,total:subtotal+shipping,currency:"INR",
        status:"demo-confirmed",
        message:"Demo order only. No payment was charged and no customer/order data was persisted."
      },201);
    }

    if(path==="/api/lead" && method==="POST"){
      const body=await request.json().catch(()=>({}));
      if(!body.name || !body.email) return json({ok:false,error:"name and email are required"},400);
      return json({ok:true,id:"lead_"+crypto.randomUUID().slice(0,8),message:"Demo lead accepted. No persistent CRM record was created."},201);
    }

    if(path==="/api/login" && method==="POST"){
      const body=await request.json().catch(()=>({}));
      if(!body.email || !body.password) return json({ok:false,error:"email and password are required"},400);
      return json({ok:true,user:{name:"Demo Admin",email:body.email,role:"admin"},token:"demo_session_"+crypto.randomUUID().slice(0,8),note:"Demonstration token only; not production authentication."});
    }

    if(path==="/api/slots" && method==="GET"){
      const day=url.searchParams.get("date")||"2026-10-05";
      return json({ok:true,date:day,slots:["10:00","11:30","14:00","16:30"]});
    }

    if(path==="/api/bookings" && method==="POST"){
      const body=await request.json().catch(()=>({}));
      if(!body.name || !body.date || !body.slot) return json({ok:false,error:"name, date and slot are required"},400);
      return json({ok:true,bookingId:"BK-"+Math.floor(100000+Math.random()*900000),status:"confirmed-demo",message:"Demo booking confirmed. Nothing was charged or persisted."},201);
    }

    if(path==="/api/tasks" && method==="GET") return json({ok:true,tasks});
    if(path==="/api/tasks" && method==="POST"){
      const body=await request.json().catch(()=>({}));
      if(!body.title) return json({ok:false,error:"title is required"},400);
      return json({ok:true,task:{id:Date.now(),title:body.title,status:"Todo",owner:"You"},message:"Demo task accepted; refresh resets sample data."},201);
    }

    if(path==="/api/quote" && method==="POST"){
      const body=await request.json().catch(()=>({}));
      const subtotal=Number(body.subtotal||0);
      return json({ok:true,subtotal,shipping:subtotal>=499?0:49,total:subtotal+(subtotal>=499?0:49),currency:"INR",note:"Demo quote only. No order or payment created."});
    }

    if(path.startsWith("/api/")) return json({ok:false,error:"Demo API route not found"},404);
    return env.ASSETS.fetch(request);
  }
};
