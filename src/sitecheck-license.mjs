// SiteCheck Pro license backend. The extension never receives a session cookie or PII.
// A signed-in customer can rotate a high-entropy license; only its SHA-256 hash is kept.
// License verification checks live captured-payment entitlement state on every request.
const json=(payload,status=200)=>new Response(JSON.stringify(payload),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,"0")).join("");
const tokenPattern=/^sc1_[A-Za-z0-9_-]{40,80}$/;
const cleanEmail=s=>String(s||"").trim().toLowerCase();
export function ensureSitecheckLicenseSchema(sql){
  sql.exec("CREATE TABLE IF NOT EXISTS sitecheck_license_keys (email TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, issued_at TEXT NOT NULL)");
}
export async function handleSitecheckLicenseInternal(request,sql,sessionUser){
  const path=new URL(request.url).pathname;
  if(!path.startsWith("/internal/sitecheck-license/"))return null;
  if(request.method!=="POST")return json({ok:false,error:"Method not allowed"},405);
  if(!(request.headers.get("content-type")||"").startsWith("application/json"))return json({ok:false,error:"JSON required"},415);
  const body=await request.json().catch(()=>null);
  if(!body||typeof body!=="object")return json({ok:false,error:"Invalid JSON"},400);
  if(path==="/internal/sitecheck-license/issue"){
    const user=await sessionUser(request);
    if(!user?.email)return json({ok:false,error:"Sign in to your Xender account"},401);
    const email=cleanEmail(user.email);
    const entitlement=sql.exec("SELECT 1 FROM extension_entitlements WHERE product_id='sitecheck' AND email=? AND status='active' LIMIT 1",email).toArray()[0];
    if(!entitlement)return json({ok:false,error:"No active SiteCheck Pro purchase on this account"},403);
    const bytes=crypto.getRandomValues(new Uint8Array(32));
    const token="sc1_"+Array.from(bytes,v=>v.toString(16).padStart(2,"0")).join("");
    const digest=await hash(token);
    sql.exec("INSERT INTO sitecheck_license_keys(email,token_hash,issued_at) VALUES (?,?,?) ON CONFLICT(email) DO UPDATE SET token_hash=excluded.token_hash,issued_at=excluded.issued_at",email,digest,new Date().toISOString());
    return json({ok:true,licenseKey:token,note:"Copy this key now. Generating a new key deactivates the old one."});
  }
  if(path==="/internal/sitecheck-license/verify"){
    const token=body.licenseKey;
    if(typeof token!=="string"||!tokenPattern.test(token))return json({ok:false,pro:false,error:"Invalid license key"},400);
    const digest=await hash(token);
    const valid=sql.exec("SELECT 1 FROM sitecheck_license_keys l WHERE l.token_hash=? AND EXISTS (SELECT 1 FROM extension_entitlements e WHERE e.email=l.email AND e.product_id='sitecheck' AND e.status='active') LIMIT 1",digest).toArray()[0];
    return json({ok:true,pro:Boolean(valid),product:"sitecheck"});
  }
  return json({ok:false,error:"Unknown endpoint"},404);
}
export const sitecheckLicenseCors=(origin)=>{
  // Only the first-party published Chrome extension may read the verification response.
  const allowed="chrome-extension://egkpcmgkfakclaooopabcmffdmaldkhe";
  return origin===allowed?{"access-control-allow-origin":allowed,"access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"content-type","vary":"Origin"}:{};
};
