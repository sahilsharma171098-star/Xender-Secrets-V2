import { DurableObject } from "cloudflare:workers";

const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store",...extra}});
const enc=new TextEncoder();
const AUTH_COOKIE="xs_session";
const SESSION_MAX_AGE=60*60*24*30;
const validEmail=email=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const b64=bytes=>{let s="";for(const b of bytes)s+=String.fromCharCode(b);return btoa(s)};
const fromB64=s=>{const raw=atob(s);const out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out};
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
const randomB64=n=>b64(crypto.getRandomValues(new Uint8Array(n)));
const randomToken=()=>randomB64(32).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const sha256=async value=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value))));
const passwordHash=async(password,saltB64)=>{
  const key=await crypto.subtle.importKey("raw",enc.encode(password),"PBKDF2",false,["deriveBits"]);
  const bits=await crypto.subtle.deriveBits({name:"PBKDF2",salt:fromB64(saltB64),iterations:180000,hash:"SHA-256"},key,256);
  return b64(new Uint8Array(bits));
};
const safeEqual=(a,b)=>{if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0};
const cookieValue=(header,name)=>{
  if(!header)return null;
  for(const part of header.split(";")){const [k,...v]=part.trim().split("=");if(k===name)return decodeURIComponent(v.join("="))}
  return null;
};
const sessionCookie=token=>AUTH_COOKIE+"="+encodeURIComponent(token)+"; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age="+SESSION_MAX_AGE;
const clearSessionCookie=()=>AUTH_COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
const clean=(v,n=500)=>String(v??"").trim().slice(0,n);

const CATALOG_PRODUCTS=[
  {id:"cable-organizer",name:"Cable Organizer Clips — 6 Pack",category:"desk",categoryLabel:"Desk & Cable",price:149,rating:4.6},
  {id:"dustbin-bags",name:"Multipurpose Dustbin Bags",category:"home",categoryLabel:"Home & Utility",price:129,rating:4.4},
  {id:"phone-stand",name:"Foldable Phone Stand",category:"mobile",categoryLabel:"Mobile Accessories",price:199,rating:4.5},
  {id:"microfiber",name:"Microfiber Cleaning Cloth — 4 Pack",category:"home",categoryLabel:"Home & Utility",price:179,rating:4.3},
  {id:"utility-hooks",name:"Self-Adhesive Utility Hooks",category:"storage",categoryLabel:"Storage",price:159,rating:4.2},
  {id:"travel-pouch",name:"Compact Travel Organizer Pouch",category:"travel",categoryLabel:"Travel",price:249,rating:4.7},
  {id:"cable-ties",name:"Reusable Cable Ties — 10 Pack",category:"desk",categoryLabel:"Desk & Cable",price:119,rating:4.4},
  {id:"storage-basket",name:"Mini Desk Storage Basket",category:"storage",categoryLabel:"Storage",price:229,rating:4.3},
  {id:"cable-protectors",name:"Cable Protector Sleeves — 4 Pack",category:"mobile",categoryLabel:"Mobile Accessories",price:99,rating:4.1}
];

export class AppState extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    this.sql=ctx.storage.sql;
    ctx.blockConcurrencyWhile(async()=>{
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS products (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          category TEXT NOT NULL,
          category_label TEXT NOT NULL,
          price INTEGER NOT NULL,
          rating REAL NOT NULL DEFAULT 0,
          active INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          pincode TEXT NOT NULL,
          address TEXT NOT NULL,
          payment_method TEXT NOT NULL,
          subtotal INTEGER NOT NULL,
          shipping INTEGER NOT NULL,
          total INTEGER NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id TEXT NOT NULL,
          product_id TEXT NOT NULL,
          product_name TEXT NOT NULL,
          unit_price INTEGER NOT NULL,
          quantity INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS leads (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          interest TEXT,
          message TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS bookings (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          date TEXT NOT NULL,
          slot TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          status TEXT NOT NULL,
          owner TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
        CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id,created_at);
        CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
        CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);
        CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date,slot);
      `);
      const now=new Date().toISOString();
      for(const p of CATALOG_PRODUCTS){
        this.sql.exec("INSERT OR IGNORE INTO products (id,name,category,category_label,price,rating,active,updated_at) VALUES (?,?,?,?,?,?,1,?)",p.id,p.name,p.category,p.categoryLabel,p.price,p.rating,now);
      }
      const count=this.sql.exec("SELECT COUNT(*) AS n FROM tasks").one().n;
      if(Number(count)===0){
        this.sql.exec("INSERT INTO tasks (id,title,status,owner,created_at) VALUES (?,?,?,?,?)","task-1","Finalize homepage copy","Done","Aarav",now);
        this.sql.exec("INSERT INTO tasks (id,title,status,owner,created_at) VALUES (?,?,?,?,?)","task-2","Review campaign dashboard","In progress","Mira",now);
        this.sql.exec("INSERT INTO tasks (id,title,status,owner,created_at) VALUES (?,?,?,?,?)","task-3","Prepare client handoff","Todo","Kabir",now);
      }
    });
  }

  getUserFromRequest(request){
    const token=cookieValue(request.headers.get("Cookie"),AUTH_COOKIE);
    if(!token)return null;
    return {token};
  }

  async sessionUser(request){
    const tokenData=this.getUserFromRequest(request);
    if(!tokenData)return null;
    const tokenHash=await sha256(tokenData.token);
    const now=new Date().toISOString();
    const rows=this.sql.exec("SELECT u.id,u.name,u.email,u.created_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",tokenHash,now).toArray();
    return rows[0]||null;
  }

  async createSession(userId){
    const token=randomToken(),tokenHash=await sha256(token),now=new Date(),expires=new Date(now.getTime()+SESSION_MAX_AGE*1000);
    this.sql.exec("DELETE FROM sessions WHERE expires_at<=?",now.toISOString());
    this.sql.exec("INSERT INTO sessions (id,user_id,token_hash,created_at,expires_at) VALUES (?,?,?,?,?)",crypto.randomUUID(),userId,tokenHash,now.toISOString(),expires.toISOString());
    return token;
  }

  sameOrigin(request){
    const origin=request.headers.get("Origin");
    if(!origin)return true;
    return origin===new URL(request.url).origin;
  }

  async fetch(request){
    const url=new URL(request.url),path=url.pathname,method=request.method.toUpperCase();

    if(method!=="GET" && !this.sameOrigin(request)) return json({ok:false,error:"Invalid request origin."},403);

    if(path==="/api/auth/status" && method==="GET") return json({ok:true,available:true,mode:"persistent"});

    if(path==="/api/auth/register" && method==="POST"){
      const body=await request.json().catch(()=>({}));
      const name=clean(body.name,60),email=clean(body.email,254).toLowerCase(),password=String(body.password||"");
      if(name.length<2)return json({ok:false,error:"Enter your full name."},400);
      if(!validEmail(email))return json({ok:false,error:"Enter a valid email address."},400);
      if(password.length<8||password.length>128)return json({ok:false,error:"Password must be 8–128 characters."},400);
      if(this.sql.exec("SELECT id FROM users WHERE email=?",email).toArray()[0])return json({ok:false,error:"An account with this email already exists."},409);
      const id=crypto.randomUUID(),salt=randomB64(16),hash=await passwordHash(password,salt),now=new Date().toISOString();
      try{this.sql.exec("INSERT INTO users (id,name,email,password_hash,password_salt,created_at,updated_at) VALUES (?,?,?,?,?,?,?)",id,name,email,hash,salt,now,now)}
      catch(e){return json({ok:false,error:"Unable to create account."},409)}
      const token=await this.createSession(id);
      return json({ok:true,user:{id,name,email,created_at:now}},201,{"set-cookie":sessionCookie(token)});
    }

    if((path==="/api/auth/login"||path==="/api/login") && method==="POST"){
      const body=await request.json().catch(()=>({}));
      const email=clean(body.email,254).toLowerCase(),password=String(body.password||"");
      const user=this.sql.exec("SELECT id,name,email,password_hash,password_salt,created_at FROM users WHERE email=?",email).toArray()[0];
      if(!user)return json({ok:false,error:"Email or password is incorrect."},401);
      const candidate=await passwordHash(password,user.password_salt);
      if(!safeEqual(candidate,user.password_hash))return json({ok:false,error:"Email or password is incorrect."},401);
      const token=await this.createSession(user.id);
      return json({ok:true,user:{id:user.id,name:user.name,email:user.email,created_at:user.created_at}},200,{"set-cookie":sessionCookie(token)});
    }

    if(path==="/api/auth/me" && method==="GET"){
      const user=await this.sessionUser(request);
      if(!user)return json({ok:false,error:"Not signed in."},401);
      return json({ok:true,user});
    }

    if(path==="/api/auth/logout" && method==="POST"){
      const token=cookieValue(request.headers.get("Cookie"),AUTH_COOKIE);
      if(token){const tokenHash=await sha256(token);this.sql.exec("DELETE FROM sessions WHERE token_hash=?",tokenHash)}
      return json({ok:true},200,{"set-cookie":clearSessionCookie()});
    }

    if((path==="/api/store/products"||path==="/api/products") && method==="GET"){
      const products=this.sql.exec("SELECT id,name,category,category_label AS categoryLabel,price,rating FROM products WHERE active=1 ORDER BY rowid").toArray();
      return json({ok:true,products});
    }

    if(path==="/api/store/checkout" && method==="POST"){
      const body=await request.json().catch(()=>({})),items=Array.isArray(body.items)?body.items:[],customer=body.customer||{};
      const name=clean(customer.name,80),email=clean(customer.email,254).toLowerCase(),phone=clean(customer.phone,30),pincode=clean(customer.pincode,12),address=clean(customer.address,500),payment=clean(customer.payment,40);
      if(!items.length)return json({ok:false,error:"Your cart is empty."},400);
      if(!name||!validEmail(email)||!phone||!pincode||!address||!payment)return json({ok:false,error:"Complete all checkout fields."},400);
      let subtotal=0;const normalized=[];
      for(const line of items.slice(0,30)){
        const product=this.sql.exec("SELECT id,name,price FROM products WHERE id=? AND active=1",clean(line.id,80)).toArray()[0];
        if(!product)return json({ok:false,error:"One of the selected products is unavailable."},400);
        const qty=Math.max(1,Math.min(10,Number(line.qty)||1));
        subtotal+=Number(product.price)*qty;normalized.push({...product,qty});
      }
      const shipping=subtotal>=499?0:49,total=subtotal+shipping,user=await this.sessionUser(request),orderId="XS-"+crypto.randomUUID().slice(0,8).toUpperCase(),now=new Date().toISOString();
      this.ctx.storage.transactionSync(()=>{
        this.sql.exec("INSERT INTO orders (id,user_id,name,email,phone,pincode,address,payment_method,subtotal,shipping,total,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",orderId,user?.id||null,name,email,phone,pincode,address,payment,subtotal,shipping,total,"received",now);
        for(const item of normalized)this.sql.exec("INSERT INTO order_items (order_id,product_id,product_name,unit_price,quantity) VALUES (?,?,?,?,?)",orderId,item.id,item.name,item.price,item.qty);
      });
      return json({ok:true,orderId,subtotal,shipping,total,currency:"INR",status:"received",message:"Your order request has been saved. Xender Secrets can contact you for fulfilment and payment confirmation."},201);
    }

    if(path==="/api/orders" && method==="GET"){
      const user=await this.sessionUser(request);
      if(!user)return json({ok:false,error:"Sign in to view orders."},401);
      const orders=this.sql.exec("SELECT id,total,status,created_at,payment_method FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 50",user.id).toArray();
      return json({ok:true,orders});
    }

    if(path==="/api/lead" && method==="POST"){
      const body=await request.json().catch(()=>({})),name=clean(body.name,80),email=clean(body.email,254).toLowerCase();
      if(!name||!validEmail(email))return json({ok:false,error:"Name and a valid email are required."},400);
      const id="lead_"+crypto.randomUUID().slice(0,8),now=new Date().toISOString();
      this.sql.exec("INSERT INTO leads (id,name,email,interest,message,created_at) VALUES (?,?,?,?,?,?)",id,name,email,clean(body.interest,120),clean(body.message,1500),now);
      return json({ok:true,id,message:"Enquiry saved successfully."},201);
    }

    if(path==="/api/slots" && method==="GET"){
      const day=clean(url.searchParams.get("date")||new Date().toISOString().slice(0,10),10);
      const all=["10:00","11:30","14:00","16:30"];
      const booked=new Set(this.sql.exec("SELECT slot FROM bookings WHERE date=?",day).toArray().map(x=>x.slot));
      return json({ok:true,date:day,slots:all.filter(x=>!booked.has(x))});
    }

    if(path==="/api/bookings" && method==="POST"){
      const body=await request.json().catch(()=>({})),name=clean(body.name,80),date=clean(body.date,10),slot=clean(body.slot,10);
      if(!name||!date||!slot)return json({ok:false,error:"Name, date and slot are required."},400);
      if(this.sql.exec("SELECT id FROM bookings WHERE date=? AND slot=?",date,slot).toArray()[0])return json({ok:false,error:"That slot is no longer available."},409);
      const id="BK-"+crypto.randomUUID().slice(0,8).toUpperCase();
      this.sql.exec("INSERT INTO bookings (id,name,date,slot,created_at) VALUES (?,?,?,?,?)",id,name,date,slot,new Date().toISOString());
      return json({ok:true,bookingId:id,status:"confirmed",message:"Booking saved successfully."},201);
    }

    if(path==="/api/tasks" && method==="GET"){
      return json({ok:true,tasks:this.sql.exec("SELECT id,title,status,owner FROM tasks ORDER BY created_at DESC LIMIT 100").toArray()});
    }

    if(path==="/api/tasks" && method==="POST"){
      const body=await request.json().catch(()=>({})),title=clean(body.title,140);
      if(!title)return json({ok:false,error:"Title is required."},400);
      const task={id:"task-"+crypto.randomUUID().slice(0,8),title,status:"Todo",owner:clean(body.owner,60)||"You"},now=new Date().toISOString();
      this.sql.exec("INSERT INTO tasks (id,title,status,owner,created_at) VALUES (?,?,?,?,?)",task.id,task.title,task.status,task.owner,now);
      const all=this.sql.exec("SELECT id FROM tasks ORDER BY created_at DESC").toArray();
      for(const old of all.slice(100))this.sql.exec("DELETE FROM tasks WHERE id=?",old.id);
      return json({ok:true,task,message:"Task saved."},201);
    }

    if(path==="/api/quote" && method==="POST"){
      const body=await request.json().catch(()=>({})),subtotal=Math.max(0,Number(body.subtotal||0)),shipping=subtotal===0?0:(subtotal>=499?0:49);
      return json({ok:true,subtotal,shipping,total:subtotal+shipping,currency:"INR"});
    }

    return json({ok:false,error:"API route not found."},404);
  }
}

function chatReply(raw){
  const q=raw.toLowerCase();
  let reply="Main Xender Secrets ke shop, website development, novels, digital products, account aur contact options ke baare mein help kar sakta hoon.";
  let actions=[{label:"Explore categories",href:"/#explore"},{label:"Contact us",href:"/contact.html"}];
  if(/shop|product|buy|cart|ecommerce|e-commerce|price|shopping|order/.test(q)){
    reply="Ecommerce Shop mein products, search, filters, persistent order requests aur account-linked order history available hai.";
    actions=[{label:"Open Shop",href:"/catalog.html"},{label:"My Account",href:"/account.html"}];
  }else if(/website|web site|frontend|front end|backend|back end|full.?stack|developer|development|landing page|api/.test(q)){
    reply="Website Development catalog mein Frontend, Backend/API aur Full-Stack builds hain. Backend flows Cloudflare Workers aur persistent SQLite storage ke saath connected hain.";
    actions=[{label:"Website Catalog",href:"/website-catalog.html"},{label:"Discuss Project",href:"https://wa.me/918368495854?text=Hi%20Xender%20Secrets%2C%20I%20want%20to%20discuss%20a%20website%20project."}];
  }else if(/novel|book|read|chinese|china|story|stories/.test(q)){
    reply="Completed Novels library mein world classics aur Chinese classics dono hain. Reading links original Project Gutenberg sources par open hote hain.";
    actions=[{label:"Browse Novels",href:"/novels.html"}];
  }else if(/prompt|tracker|digital product|workflow|template|ai tool/.test(q)){
    reply="Digital Products section mein Sales Trackers, Prompt Packs aur Workflow Templates hain. Custom versions business use-case ke hisaab se ban sakte hain.";
    actions=[{label:"Digital Products",href:"/#products"},{label:"Ask on WhatsApp",href:"https://wa.me/918368495854"}];
  }else if(/lead|sales|customer|cx|research|service/.test(q)){
    reply="Services mein Website & Landing Pages, Lead Generation & Research, Sales/CX Support aur AI-assisted workflows included hain.";
    actions=[{label:"View Services",href:"/#services"},{label:"Start Enquiry",href:"https://wa.me/918368495854"}];
  }else if(/account|register|registration|login|log in|sign in|sign up|profile/.test(q)){
    reply="Xender Account supports server-side registration, login, secure sessions and account-linked order history.";
    actions=[{label:"Login / Register",href:"/account.html"}];
  }else if(/contact|whatsapp|email|call|talk|human|person|support/.test(q)){
    reply="Aap Xender Secrets ko WhatsApp, email ya Contact page se reach kar sakte ho.";
    actions=[{label:"WhatsApp",href:"https://wa.me/918368495854"},{label:"Contact Page",href:"/contact.html"},{label:"Email",href:"mailto:Sahilsharma171098@gmail.com"}];
  }else if(/refund|return|policy|privacy|terms/.test(q)){
    reply="Privacy, Terms aur Refund pages website footer mein available hain.";
    actions=[{label:"Refunds",href:"/refund.html"},{label:"Privacy",href:"/privacy.html"},{label:"Terms",href:"/terms.html"}];
  }
  return {reply,actions};
}

export default {
  async fetch(request,env){
    const url=new URL(request.url),path=url.pathname,method=request.method.toUpperCase();

    if(path==="/api/chat" && method==="POST"){
      const body=await request.json().catch(()=>({})),raw=clean(body.message,500);
      if(!raw)return json({ok:false,error:"Message is required."},400);
      return json({ok:true,...chatReply(raw)});
    }

    if(path==="/api/health" && method==="GET")return json({ok:true,service:"Xender Secrets API",architecture:"Cloudflare Worker + SQLite Durable Object",persistent:true,time:new Date().toISOString()});
    if(path==="/api/catalog" && method==="GET")return json({ok:true,categories:["Frontend","Backend / API","Full Stack"],builds:9,persistentBackend:true});

    if(path.startsWith("/api/")){
      const id=env.APP_STATE.idFromName("xender-secrets");
      const stub=env.APP_STATE.get(id);
      return stub.fetch(request);
    }

    return env.ASSETS.fetch(request);
  }
};
