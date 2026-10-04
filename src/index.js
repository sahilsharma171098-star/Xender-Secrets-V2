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
const b64url=bytes=>b64(bytes).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const sha256Raw=async value=>new Uint8Array(await crypto.subtle.digest("SHA-256",enc.encode(value)));
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
        CREATE TABLE IF NOT EXISTS otp_codes (
          email TEXT PRIMARY KEY COLLATE NOCASE,
          code_hash TEXT NOT NULL,
          code_salt TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          sent_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS oauth_states (
          state TEXT PRIMARY KEY,
          provider TEXT NOT NULL,
          verifier TEXT,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS auth_identities (
          provider TEXT NOT NULL,
          provider_user_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          provider_email TEXT,
          created_at TEXT NOT NULL,
          PRIMARY KEY(provider,provider_user_id)
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
        CREATE INDEX IF NOT EXISTS idx_oauth_states_expiry ON oauth_states(expires_at);
        CREATE INDEX IF NOT EXISTS idx_auth_identities_user ON auth_identities(user_id);
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


    if(path==="/api/auth/providers" && method==="GET"){
      return json({ok:true,providers:{
        otp:Boolean(this.env.RESEND_API_KEY&&this.env.AUTH_FROM_EMAIL),
        google:Boolean(this.env.GOOGLE_CLIENT_ID&&this.env.GOOGLE_CLIENT_SECRET),
        github:Boolean(this.env.GITHUB_CLIENT_ID&&this.env.GITHUB_CLIENT_SECRET),
        facebook:Boolean(this.env.FACEBOOK_CLIENT_ID&&this.env.FACEBOOK_CLIENT_SECRET),
        x:Boolean(this.env.X_CLIENT_ID)
      }});
    }

    if(path==="/api/auth/otp/request" && method==="POST"){
      if(!this.env.RESEND_API_KEY||!this.env.AUTH_FROM_EMAIL)return json({ok:false,error:"Email OTP is not configured yet."},503);
      const body=await request.json().catch(()=>({})),email=clean(body.email,254).toLowerCase();
      if(!validEmail(email))return json({ok:false,error:"Enter a valid email address."},400);
      const previous=this.sql.exec("SELECT sent_at FROM otp_codes WHERE email=?",email).toArray()[0];
      if(previous&&Date.now()-new Date(previous.sent_at).getTime()<60000)return json({ok:false,error:"Please wait a minute before requesting another code."},429);
      const code=String(100000+(crypto.getRandomValues(new Uint32Array(1))[0]%900000)),salt=randomB64(16),hash=await sha256(code+salt),now=new Date(),expires=new Date(now.getTime()+10*60*1000);
      this.sql.exec("INSERT OR REPLACE INTO otp_codes(email,code_hash,code_salt,attempts,sent_at,expires_at) VALUES(?,?,?,?,?,?)",email,hash,salt,0,now.toISOString(),expires.toISOString());
      const send=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"authorization":"Bearer "+this.env.RESEND_API_KEY,"content-type":"application/json"},body:JSON.stringify({
        from:this.env.AUTH_FROM_EMAIL,to:[email],subject:"Your Xender Secrets login code",
        html:"<div style='font-family:Arial,sans-serif;max-width:520px;margin:auto'><h2>Xender Secrets</h2><p>Your sign-in code is:</p><div style='font-size:34px;font-weight:800;letter-spacing:8px;padding:18px 0'>"+code+"</div><p>This code expires in 10 minutes. If you did not request it, you can ignore this email.</p></div>"
      })});
      if(!send.ok){this.sql.exec("DELETE FROM otp_codes WHERE email=?",email);return json({ok:false,error:"Unable to send the login code right now."},502)}
      return json({ok:true,message:"Login code sent."});
    }

    if(path==="/api/auth/otp/verify" && method==="POST"){
      const body=await request.json().catch(()=>({})),email=clean(body.email,254).toLowerCase(),code=clean(body.code,8);
      if(!validEmail(email)||!/^[0-9]{6}$/.test(code))return json({ok:false,error:"Enter the 6-digit code sent to your email."},400);
      const row=this.sql.exec("SELECT code_hash,code_salt,attempts,expires_at FROM otp_codes WHERE email=?",email).toArray()[0];
      if(!row||new Date(row.expires_at).getTime()<Date.now()){this.sql.exec("DELETE FROM otp_codes WHERE email=?",email);return json({ok:false,error:"This code has expired. Request a new one."},400)}
      if(Number(row.attempts)>=6){this.sql.exec("DELETE FROM otp_codes WHERE email=?",email);return json({ok:false,error:"Too many attempts. Request a new code."},429)}
      const candidate=await sha256(code+row.code_salt);
      if(!safeEqual(candidate,row.code_hash)){this.sql.exec("UPDATE otp_codes SET attempts=attempts+1 WHERE email=?",email);return json({ok:false,error:"Incorrect code."},401)}
      this.sql.exec("DELETE FROM otp_codes WHERE email=?",email);
      let user=this.sql.exec("SELECT id,name,email,created_at FROM users WHERE email=?",email).toArray()[0];
      if(!user){
        const id=crypto.randomUUID(),name=email.split("@")[0].replace(/[._-]+/g," ").replace(/\b\w/g,m=>m.toUpperCase()).slice(0,60)||"Member",salt=randomB64(16),hash=await passwordHash(randomToken(),salt),now=new Date().toISOString();
        this.sql.exec("INSERT INTO users(id,name,email,password_hash,password_salt,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",id,name,email,hash,salt,now,now);
        user={id,name,email,created_at:now};
      }
      this.sql.exec("INSERT OR IGNORE INTO auth_identities(provider,provider_user_id,user_id,provider_email,created_at) VALUES('email_otp',?,?,?,?)",email,user.id,email,new Date().toISOString());
      const token=await this.createSession(user.id);
      return json({ok:true,user},200,{"set-cookie":sessionCookie(token)});
    }

    if(path.startsWith("/api/auth/oauth/")){
      const parts=path.split("/").filter(Boolean),provider=parts[3],stage=parts[4]||"";
      const supported=["google","github","facebook","x"];
      if(!supported.includes(provider))return json({ok:false,error:"Unsupported sign-in provider."},404);
      const origin=url.origin,redirectUri=origin+"/api/auth/oauth/"+provider+"/callback";

      if(stage==="start"&&method==="GET"){
        const state=randomToken(),now=new Date(),expires=new Date(now.getTime()+10*60*1000);
        let verifier=null,authorize=null;
        if(provider==="google"){
          if(!this.env.GOOGLE_CLIENT_ID||!this.env.GOOGLE_CLIENT_SECRET)return json({ok:false,error:"Google sign-in is not configured yet."},503);
          authorize=new URL("https://accounts.google.com/o/oauth2/v2/auth");
          authorize.search=new URLSearchParams({client_id:this.env.GOOGLE_CLIENT_ID,redirect_uri:redirectUri,response_type:"code",scope:"openid email profile",state,prompt:"select_account"}).toString();
        }else if(provider==="github"){
          if(!this.env.GITHUB_CLIENT_ID||!this.env.GITHUB_CLIENT_SECRET)return json({ok:false,error:"GitHub sign-in is not configured yet."},503);
          authorize=new URL("https://github.com/login/oauth/authorize");
          authorize.search=new URLSearchParams({client_id:this.env.GITHUB_CLIENT_ID,redirect_uri:redirectUri,scope:"read:user user:email",state}).toString();
        }else if(provider==="facebook"){
          if(!this.env.FACEBOOK_CLIENT_ID||!this.env.FACEBOOK_CLIENT_SECRET)return json({ok:false,error:"Facebook sign-in is not configured yet."},503);
          authorize=new URL("https://www.facebook.com/dialog/oauth");
          authorize.search=new URLSearchParams({client_id:this.env.FACEBOOK_CLIENT_ID,redirect_uri:redirectUri,response_type:"code",scope:"public_profile,email",state}).toString();
        }else{
          if(!this.env.X_CLIENT_ID)return json({ok:false,error:"X sign-in is not configured yet."},503);
          verifier=randomToken()+randomToken().slice(0,20);
          const challenge=b64url(await sha256Raw(verifier));
          authorize=new URL("https://twitter.com/i/oauth2/authorize");
          authorize.search=new URLSearchParams({client_id:this.env.X_CLIENT_ID,redirect_uri:redirectUri,response_type:"code",scope:"users.read tweet.read",state,code_challenge:challenge,code_challenge_method:"S256"}).toString();
        }
        this.sql.exec("DELETE FROM oauth_states WHERE expires_at<=?",now.toISOString());
        this.sql.exec("INSERT INTO oauth_states(state,provider,verifier,created_at,expires_at) VALUES(?,?,?,?,?)",state,provider,verifier,now.toISOString(),expires.toISOString());
        return Response.redirect(authorize.toString(),302);
      }

      if(stage==="callback"&&method==="GET"){
        const code=url.searchParams.get("code"),state=url.searchParams.get("state");
        if(!code||!state)return Response.redirect(origin+"/account.html?auth=error",302);
        const saved=this.sql.exec("SELECT provider,verifier,expires_at FROM oauth_states WHERE state=?",state).toArray()[0];
        this.sql.exec("DELETE FROM oauth_states WHERE state=?",state);
        if(!saved||saved.provider!==provider||new Date(saved.expires_at).getTime()<Date.now())return Response.redirect(origin+"/account.html?auth=expired",302);

        let externalId="",name="",email="",emailVerified=false;
        try{
          if(provider==="google"){
            const tokenRes=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:this.env.GOOGLE_CLIENT_ID,client_secret:this.env.GOOGLE_CLIENT_SECRET,code,grant_type:"authorization_code",redirect_uri:redirectUri})});
            const tok=await tokenRes.json();if(!tokenRes.ok||!tok.access_token)throw new Error("token");
            const pr=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{"authorization":"Bearer "+tok.access_token}}),p=await pr.json();
            externalId=String(p.sub||"");name=clean(p.name||p.email?.split("@")[0]||"Google member",60);email=clean(p.email,254).toLowerCase();emailVerified=Boolean(p.email_verified);
          }else if(provider==="github"){
            const tokenRes=await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{"accept":"application/json","content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:this.env.GITHUB_CLIENT_ID,client_secret:this.env.GITHUB_CLIENT_SECRET,code,redirect_uri:redirectUri})});
            const tok=await tokenRes.json();if(!tokenRes.ok||!tok.access_token)throw new Error("token");
            const headers={"authorization":"Bearer "+tok.access_token,"accept":"application/vnd.github+json","user-agent":"Xender-Secrets"};
            const pr=await fetch("https://api.github.com/user",{headers}),p=await pr.json();externalId=String(p.id||"");name=clean(p.name||p.login||"GitHub member",60);email=clean(p.email,254).toLowerCase();
            if(!email){const er=await fetch("https://api.github.com/user/emails",{headers});if(er.ok){const emails=await er.json();const best=emails.find(x=>x.primary&&x.verified)||emails.find(x=>x.verified);if(best){email=clean(best.email,254).toLowerCase();emailVerified=true}}}else emailVerified=true;
          }else if(provider==="facebook"){
            const tokenUrl=new URL("https://graph.facebook.com/oauth/access_token");tokenUrl.search=new URLSearchParams({client_id:this.env.FACEBOOK_CLIENT_ID,client_secret:this.env.FACEBOOK_CLIENT_SECRET,redirect_uri:redirectUri,code}).toString();
            const tokenRes=await fetch(tokenUrl),tok=await tokenRes.json();if(!tokenRes.ok||!tok.access_token)throw new Error("token");
            const pr=await fetch("https://graph.facebook.com/me?fields=id,name,email",{headers:{"authorization":"Bearer "+tok.access_token}}),p=await pr.json();
            externalId=String(p.id||"");name=clean(p.name||"Facebook member",60);email=clean(p.email,254).toLowerCase();emailVerified=Boolean(email);
          }else{
            const headers={"content-type":"application/x-www-form-urlencoded"};
            if(this.env.X_CLIENT_SECRET)headers.authorization="Basic "+btoa(this.env.X_CLIENT_ID+":"+this.env.X_CLIENT_SECRET);
            const params={client_id:this.env.X_CLIENT_ID,code,grant_type:"authorization_code",redirect_uri:redirectUri,code_verifier:saved.verifier};
            const tokenRes=await fetch("https://api.x.com/2/oauth2/token",{method:"POST",headers,body:new URLSearchParams(params)}),tok=await tokenRes.json();
            if(!tokenRes.ok||!tok.access_token)throw new Error("token");
            const pr=await fetch("https://api.x.com/2/users/me",{headers:{"authorization":"Bearer "+tok.access_token}}),p=await pr.json(),u=p.data||{};
            externalId=String(u.id||"");name=clean(u.name||u.username||"X member",60);email="";
          }
          if(!externalId)throw new Error("profile");
        }catch(e){return Response.redirect(origin+"/account.html?auth=provider_error",302)}

        let identity=this.sql.exec("SELECT user_id FROM auth_identities WHERE provider=? AND provider_user_id=?",provider,externalId).toArray()[0],user=null;
        if(identity)user=this.sql.exec("SELECT id,name,email,created_at FROM users WHERE id=?",identity.user_id).toArray()[0];
        if(!user&&email&&emailVerified)user=this.sql.exec("SELECT id,name,email,created_at FROM users WHERE email=?",email).toArray()[0];
        if(!user){
          const id=crypto.randomUUID(),safeEmail=email&&emailVerified?email:(provider+"-"+externalId+"@social.xendersecrets.local"),salt=randomB64(16),hash=await passwordHash(randomToken(),salt),now=new Date().toISOString();
          this.sql.exec("INSERT INTO users(id,name,email,password_hash,password_salt,created_at,updated_at) VALUES(?,?,?,?,?,?,?)",id,name||"Member",safeEmail,hash,salt,now,now);
          user={id,name:name||"Member",email:safeEmail,created_at:now};
        }
        this.sql.exec("INSERT OR REPLACE INTO auth_identities(provider,provider_user_id,user_id,provider_email,created_at) VALUES(?,?,?,?,?)",provider,externalId,user.id,email||null,new Date().toISOString());
        const session=await this.createSession(user.id);
        return new Response(null,{status:302,headers:{location:origin+"/account.html?auth="+provider,"set-cookie":sessionCookie(session),"cache-control":"no-store"}});
      }
    }

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


const COMMUNITY_CATEGORIES=["general","ideas","webdev","ecommerce","ai","business","books"];

async function appUser(request,env){
  const id=env.APP_STATE.idFromName("xender-secrets");
  const stub=env.APP_STATE.get(id);
  const u=new URL(request.url);
  u.pathname="/api/auth/me";u.search="";
  const headers=new Headers();
  const cookie=request.headers.get("Cookie");
  if(cookie)headers.set("Cookie",cookie);
  const r=await stub.fetch(new Request(u.toString(),{method:"GET",headers}));
  if(!r.ok)return null;
  const j=await r.json();
  return j.user||null;
}
function indexStub(env,category){
  const id=env.COMMUNITY_INDEX.idFromName("community-"+category);
  return env.COMMUNITY_INDEX.get(id);
}
function threadStub(env,id){
  const oid=env.CONTENT_THREAD.idFromName(id);
  return env.CONTENT_THREAD.get(oid);
}
async function callJson(stub,path,method="GET",body){
  const init={method,headers:{"content-type":"application/json"}};
  if(body!==undefined)init.body=JSON.stringify(body);
  const r=await stub.fetch(new Request("https://internal"+path,init));
  const j=await r.json().catch(()=>({}));
  return {r,j};
}

export class CommunityIndex extends DurableObject{
  constructor(ctx,env){
    super(ctx,env);this.sql=ctx.storage.sql;this.env=env;
    ctx.blockConcurrencyWhile(async()=>{
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS posts(
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          excerpt TEXT NOT NULL,
          category TEXT NOT NULL,
          author_id TEXT NOT NULL,
          author_name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          likes INTEGER NOT NULL DEFAULT 0,
          comments INTEGER NOT NULL DEFAULT 0,
          views INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'published'
        );
        CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at);
        CREATE INDEX IF NOT EXISTS idx_posts_activity ON posts(likes,comments,views,created_at);
      `);
    });
  }
  async fetch(request){
    const url=new URL(request.url),path=url.pathname,method=request.method.toUpperCase();
    if(path==="/index/add"&&method==="POST"){
      const p=await request.json();
      this.sql.exec("INSERT OR REPLACE INTO posts(id,title,excerpt,category,author_id,author_name,created_at,updated_at,likes,comments,views,status) VALUES(?,?,?,?,?,?,?,?,0,0,0,'published')",
        p.id,p.title,p.excerpt,p.category,p.authorId,p.authorName,p.createdAt,p.createdAt);
      return json({ok:true});
    }
    if(path==="/index/stats"&&method==="POST"){
      const x=await request.json();
      this.sql.exec("UPDATE posts SET likes=?,comments=?,views=?,updated_at=? WHERE id=?",Number(x.likes)||0,Number(x.comments)||0,Number(x.views)||0,new Date().toISOString(),x.id);
      return json({ok:true});
    }
    if(path==="/index/feed"&&method==="GET"){
      const limit=Math.max(1,Math.min(50,Number(url.searchParams.get("limit")||20)));
      const sort=url.searchParams.get("sort")==="trending"?"trending":"latest";
      const order=sort==="trending"?"(likes*4 + comments*6 + views*0.15) DESC, created_at DESC":"created_at DESC";
      const posts=this.sql.exec(`SELECT id,title,excerpt,category,author_name AS authorName,created_at AS createdAt,likes,comments,views FROM posts WHERE status='published' ORDER BY ${order} LIMIT ${limit}`).toArray();
      const total=Number(this.sql.exec("SELECT COUNT(*) AS n FROM posts WHERE status='published'").one().n);
      return json({ok:true,posts,total});
    }
    return json({ok:false,error:"Index route not found."},404);
  }
}

export class ContentThread extends DurableObject{
  constructor(ctx,env){
    super(ctx,env);this.sql=ctx.storage.sql;
    ctx.blockConcurrencyWhile(async()=>{
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS content(
          id TEXT PRIMARY KEY,
          kind TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          category TEXT NOT NULL,
          author_id TEXT NOT NULL,
          author_name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          views INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS comments(
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          user_name TEXT NOT NULL,
          body TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS likes(
          user_id TEXT PRIMARY KEY,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS reports(
          user_id TEXT PRIMARY KEY,
          reason TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);
      `);
    });
  }
  stats(){
    return {
      likes:Number(this.sql.exec("SELECT COUNT(*) AS n FROM likes").one().n),
      comments:Number(this.sql.exec("SELECT COUNT(*) AS n FROM comments").one().n),
      views:Number(this.sql.exec("SELECT COALESCE(MAX(views),0) AS n FROM content").one().n)
    };
  }
  async fetch(request){
    const url=new URL(request.url),path=url.pathname,method=request.method.toUpperCase();
    if(path==="/thread/init"&&method==="POST"){
      const p=await request.json();
      this.sql.exec("INSERT OR IGNORE INTO content(id,kind,title,body,category,author_id,author_name,created_at,views) VALUES(?,?,?,?,?,?,?,?,0)",
        p.id,p.kind||"post",p.title||"",p.body||"",p.category||"general",p.authorId||"",p.authorName||"Xender Secrets",p.createdAt||new Date().toISOString());
      return json({ok:true});
    }
    if(path==="/thread/view"&&method==="GET"){
      this.sql.exec("UPDATE content SET views=views+1");
      const content=this.sql.exec("SELECT id,kind,title,body,category,author_id AS authorId,author_name AS authorName,created_at AS createdAt,views FROM content LIMIT 1").toArray()[0]||null;
      if(!content)return json({ok:false,error:"Content not found."},404);
      const comments=this.sql.exec("SELECT id,user_name AS userName,body,created_at AS createdAt FROM comments ORDER BY created_at ASC LIMIT 200").toArray();
      return json({ok:true,content,comments,stats:this.stats()});
    }
    if(path==="/thread/stats"&&method==="GET")return json({ok:true,stats:this.stats()});
    if(path==="/thread/comment"&&method==="POST"){
      const p=await request.json(),body=clean(p.body,1200);
      if(body.length<2)return json({ok:false,error:"Comment is too short."},400);
      const comment={id:"c-"+crypto.randomUUID().slice(0,10),userName:clean(p.userName,60),body,createdAt:new Date().toISOString()};
      this.sql.exec("INSERT INTO comments(id,user_id,user_name,body,created_at) VALUES(?,?,?,?,?)",comment.id,p.userId,comment.userName,comment.body,comment.createdAt);
      const category=this.sql.exec("SELECT category FROM content LIMIT 1").toArray()[0]?.category||"general";return json({ok:true,comment,category,stats:this.stats()},201);
    }
    if(path==="/thread/like"&&method==="POST"){
      const p=await request.json(),existing=this.sql.exec("SELECT user_id FROM likes WHERE user_id=?",p.userId).toArray()[0];
      if(existing)this.sql.exec("DELETE FROM likes WHERE user_id=?",p.userId);
      else this.sql.exec("INSERT INTO likes(user_id,created_at) VALUES(?,?)",p.userId,new Date().toISOString());
      const category=this.sql.exec("SELECT category FROM content LIMIT 1").toArray()[0]?.category||"general";return json({ok:true,liked:!existing,category,stats:this.stats()});
    }
    if(path==="/thread/report"&&method==="POST"){
      const p=await request.json(),reason=clean(p.reason,300)||"Community report";
      this.sql.exec("INSERT OR REPLACE INTO reports(user_id,reason,created_at) VALUES(?,?,?)",p.userId,reason,new Date().toISOString());
      const reports=Number(this.sql.exec("SELECT COUNT(*) AS n FROM reports").one().n);
      return json({ok:true,reports});
    }
    return json({ok:false,error:"Thread route not found."},404);
  }
}

function chatReply(raw){
  const q=raw.toLowerCase();
  let reply="Main Xender Secrets ke shop, website development, community, articles, novels, digital products, account aur contact options ke baare mein help kar sakta hoon.";
  let actions=[{label:"Explore categories",href:"/#explore"},{label:"Contact us",href:"/contact.html"}];
  if(/community|discussion|post|comment|forum|member/.test(q)){
    reply="Community mein members Web Development, Ecommerce, AI, Business, Books aur General topics par posts, comments aur likes ke through discuss kar sakte hain. Posting ke liye account login required hai.";
    actions=[{label:"Open Community",href:"/community.html"},{label:"Login",href:"/account.html"}];
  }else if(/shop|product|buy|cart|ecommerce|e-commerce|price|shopping|order/.test(q)){
    reply="Ecommerce Shop mein products, search, filters, persistent order requests aur account-linked order history available hai.";
    actions=[{label:"Open Shop",href:"/catalog.html"},{label:"My Account",href:"/account.html"}];
  }else if(/idea|ideas|build board|idea catalog|what.*build|want.*built|deploy/.test(q)){
    reply="Idea Catalog / Build Board mein members jo website, app, automation ya AI workflow chahte hain woh publish kar sakte hain. Xender un ideas ko scope karke build aur deploy kar sakta hai.";
    actions=[{label:"Open Idea Catalog",href:"/ideas.html"},{label:"Share an Idea",href:"/ideas.html#share-idea"}];
  }else if(/website|web site|frontend|front end|backend|back end|full.?stack|developer|development|landing page|api/.test(q)){
    reply="Website Development catalog mein Frontend, Backend/API aur Full-Stack builds hain. Backend flows Cloudflare Workers aur persistent SQLite storage ke saath connected hain.";
    actions=[{label:"Website Catalog",href:"/website-catalog.html"},{label:"Discuss Project",href:"https://wa.me/919821941814?text=Hi%20Xender%20Secrets%2C%20I%20want%20to%20discuss%20a%20website%20project."}];
  }else if(/novel|book|read|chinese|china|story|stories/.test(q)){
    reply="Completed Novels library mein world classics aur Chinese classics dono hain. Reading links original Project Gutenberg sources par open hote hain.";
    actions=[{label:"Browse Novels",href:"/novels.html"}];
  }else if(/prompt|tracker|digital product|workflow|template|ai tool/.test(q)){
    reply="Digital Products section mein Sales Trackers, Prompt Packs aur Workflow Templates hain. Custom versions business use-case ke hisaab se ban sakte hain.";
    actions=[{label:"Digital Products",href:"/#products"},{label:"Ask on WhatsApp",href:"https://wa.me/919821941814"}];
  }else if(/lead|sales|customer|cx|research|service/.test(q)){
    reply="Services mein Website & Landing Pages, Lead Generation & Research, Sales/CX Support aur AI-assisted workflows included hain.";
    actions=[{label:"View Services",href:"/#services"},{label:"Start Enquiry",href:"https://wa.me/919821941814"}];
  }else if(/account|register|registration|login|log in|sign in|sign up|profile/.test(q)){
    reply="Xender Account supports server-side registration, login, secure sessions and account-linked order history.";
    actions=[{label:"Login / Register",href:"/account.html"}];
  }else if(/contact|whatsapp|email|call|talk|human|person|support/.test(q)){
    reply="Aap Xender Secrets ko WhatsApp, email ya Contact page se reach kar sakte ho.";
    actions=[{label:"WhatsApp",href:"https://wa.me/919821941814"},{label:"Contact Page",href:"/contact.html"},{label:"Email",href:"mailto:Sahilsharma171098@gmail.com"}];
  }else if(/refund|return|policy|privacy|terms/.test(q)){
    reply="Privacy, Terms aur Refund pages website footer mein available hain.";
    actions=[{label:"Refunds",href:"/refund.html"},{label:"Privacy",href:"/privacy.html"},{label:"Terms",href:"/terms.html"}];
  }
  return {reply,actions};
}

export default {
  async fetch(request,env){
    const url=new URL(request.url),path=url.pathname,method=request.method.toUpperCase();


    if(path==="/api/community/feed" && method==="GET"){
      const category=clean(url.searchParams.get("category")||"all",30),sort=url.searchParams.get("sort")==="trending"?"trending":"latest",limit=Math.max(1,Math.min(30,Number(url.searchParams.get("limit")||20)));
      const cats=category==="all"?COMMUNITY_CATEGORIES:(COMMUNITY_CATEGORIES.includes(category)?[category]:["general"]);
      const results=await Promise.all(cats.map(async c=>{
        const {j}=await callJson(indexStub(env,c),"/index/feed?sort="+sort+"&limit="+limit);
        return j;
      }));
      let posts=results.flatMap(x=>x.posts||[]);
      posts.sort((a,b)=>sort==="trending"
        ? ((b.likes*4+b.comments*6+b.views*.15)-(a.likes*4+a.comments*6+a.views*.15)) || String(b.createdAt).localeCompare(String(a.createdAt))
        : String(b.createdAt).localeCompare(String(a.createdAt)));
      posts=posts.slice(0,limit);
      return json({ok:true,posts,total:results.reduce((n,x)=>n+Number(x.total||0),0),categories:COMMUNITY_CATEGORIES});
    }

    if(path==="/api/community/posts" && method==="POST"){
      const user=await appUser(request,env);
      if(!user)return json({ok:false,error:"Login is required to publish in the community."},401);
      const body=await request.json().catch(()=>({}));
      const title=clean(body.title,140),text=clean(body.body,7000),category=COMMUNITY_CATEGORIES.includes(body.category)?body.category:"general";
      if(title.length<6)return json({ok:false,error:"Title must be at least 6 characters."},400);
      if(text.length<20)return json({ok:false,error:"Post must be at least 20 characters."},400);
      const id="post-"+crypto.randomUUID().slice(0,12),createdAt=new Date().toISOString(),excerpt=text.slice(0,220);
      await callJson(threadStub(env,id),"/thread/init","POST",{id,kind:"post",title,body:text,category,authorId:user.id,authorName:user.name,createdAt});
      await callJson(indexStub(env,category),"/index/add","POST",{id,title,excerpt,category,authorId:user.id,authorName:user.name,createdAt});
      return json({ok:true,post:{id,title,excerpt,category,authorName:user.name,createdAt,likes:0,comments:0,views:0}},201);
    }

    if(path.startsWith("/api/community/posts/")){
      const parts=path.split("/").filter(Boolean),postId=parts[3],action=parts[4]||"";
      const stub=threadStub(env,postId);
      if(method==="GET"&&!action){
        const {r,j}=await callJson(stub,"/thread/view");
        if(!r.ok)return json(j,r.status);
        if(j.content?.category)await callJson(indexStub(env,j.content.category),"/index/stats","POST",{id:postId,...j.stats});
        return json(j);
      }
      if(method==="POST"&&(action==="comments"||action==="like"||action==="report")){
        const user=await appUser(request,env);
        if(!user)return json({ok:false,error:"Login is required for this action."},401);
        let endpoint,payload={userId:user.id,userName:user.name};
        if(action==="comments"){const b=await request.json().catch(()=>({}));endpoint="/thread/comment";payload.body=b.body}
        if(action==="like")endpoint="/thread/like";
        if(action==="report"){const b=await request.json().catch(()=>({}));endpoint="/thread/report";payload.reason=b.reason}
        const {r,j}=await callJson(stub,endpoint,"POST",payload);
        if(!r.ok)return json(j,r.status);
        if(j.stats&&j.category)await callJson(indexStub(env,j.category),"/index/stats","POST",{id:postId,...j.stats});
        return json(j,r.status);
      }
    }

    if(path.startsWith("/api/engagement/")){
      const parts=path.split("/").filter(Boolean),slug=clean(parts[2],120),action=parts[3]||"";
      if(!slug)return json({ok:false,error:"Content id is required."},400);
      const id="article:"+slug,stub=threadStub(env,id);
      await callJson(stub,"/thread/init","POST",{id,kind:"article",title:slug,body:"",category:"articles",authorId:"xender",authorName:"Xender Secrets",createdAt:new Date().toISOString()});
      if(method==="GET"&&!action){
        const {r,j}=await callJson(stub,"/thread/view");
        return json({ok:r.ok,stats:j.stats||{likes:0,comments:0,views:0}},r.status);
      }
      if(method==="POST"&&action==="like"){
        const user=await appUser(request,env);
        if(!user)return json({ok:false,error:"Login is required to react."},401);
        const {r,j}=await callJson(stub,"/thread/like","POST",{userId:user.id,userName:user.name});
        return json(j,r.status);
      }
    }

    if(path==="/api/site-config" && method==="GET")return json({ok:true,telegramUrl:clean(env.TELEGRAM_CHANNEL_URL||"",300)});

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
