// Customer self-serve "Check my payment again" (POST /api/payu/recheck). Offline: no merchant
// keys or real money. A signed-in account can only ever settle its own pending SiteCheck order,
// only when PayU verify_payment says captured with the exact amount, at most once a minute.
import test from "node:test";
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {handlePayu,handlePayuLedger,ensurePayuSchema} from "../../src/payu-routes.mjs";

const origin="https://www.xendersecrets.com";
const A={id:"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",name:"Buyer A",email:"a@example.com"};
const B={id:"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",name:"Buyer B",email:"b@example.com"};
const sqlAdapter=db=>({exec(stmt,...args){
  if(!args.length&&/^\s*CREATE\s/i.test(stmt)){db.exec(stmt);return {toArray:()=>[]};}
  const p=db.prepare(stmt);
  if(/^\s*SELECT\s/i.test(stmt))return {toArray:()=>p.all(...args)};
  p.run(...args);return {toArray:()=>[]};
}});
function harness(){
  const db=new DatabaseSync(":memory:");
  ensurePayuSchema(db);
  const sql=sqlAdapter(db);
  let signedIn=A;
  const stub={fetch:async request=>{
    const path=new URL(request.url).pathname;
    if(path==="/api/auth/me")return signedIn?Response.json({ok:true,user:signedIn}):Response.json({ok:false},{status:401});
    if(path.startsWith("/api/payu-ledger/"))return handlePayuLedger(request,sql);
    return new Response("not found",{status:404});
  }};
  const env={PAYU_KEY:"k",PAYU_SALT:"s",APP_STATE:{idFromName:()=>({}),get:()=>stub}};
  const ledger=(action,body)=>handlePayuLedger(new Request("https://internal.invalid/api/payu-ledger/"+action,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}),sql).then(r=>r.json());
  const addOrder=async(user,txnid,createdAt=new Date().toISOString())=>{
    assert.equal((await ledger("create",{order:{txnid,offerId:"sitecheck-pro-onetime",amountPaise:49900,name:user.name,email:user.email,phone:"9876543210",reference:"",createdAt,accountId:user.id}})).ok,true);
  };
  const recheck=(headers={Origin:origin,Cookie:"xs_session=x"})=>handlePayu(new Request(origin+"/api/payu/recheck",{method:"POST",headers:{"content-type":"application/json",...headers},body:"{}"}),env);
  const status=txnid=>db.prepare("SELECT status FROM payu_orders WHERE txnid=?").get(txnid).status;
  const grants=()=>db.prepare("SELECT COUNT(*) AS n FROM extension_entitlements").get().n;
  return {db,env,ledger,addOrder,recheck,status,grants,signIn:u=>{signedIn=u;}};
}
const payuSays=(byTxn)=>{globalThis.fetch=async(url,opts)=>{
  const id=opts.body.get("var1");
  if(byTxn instanceof Error)throw byTxn;
  return Response.json({transaction_details:{[id]:{mihpayid:"9"+id.slice(-10),amt:"499.00",...(byTxn[id]||{status:"pending",unmappedstatus:"pending"})}}});
};};

test("recheck needs a signed-in account and a same-origin request",async()=>{
  const h=harness();
  assert.equal((await h.recheck({Cookie:"xs_session=x"})).status,403,"no Origin");
  assert.equal((await h.recheck({Origin:"https://attacker.example",Cookie:"xs_session=x"})).status,403);
  assert.equal((await h.recheck({Origin:origin})).status,401,"no session cookie");
  h.signIn(null);
  assert.equal((await h.recheck()).status,401,"expired session");
  h.db.close();
});

test("a captured payment is settled once for its own account; repeat within a minute is throttled",async()=>{
  const h=harness();const prior=globalThis.fetch;
  try{
    await h.addOrder(A,"XSAAAAAAAAAAAAAAAAAA01");
    payuSays({XSAAAAAAAAAAAAAAAAAA01:{status:"success",unmappedstatus:"captured"}});
    const r=await h.recheck();
    assert.equal(r.status,200);
    assert.deepEqual(await r.json(),{ok:true,checked:1,settled:1,unavailable:false});
    assert.equal(h.status("XSAAAAAAAAAAAAAAAAAA01"),"captured");
    assert.equal(h.grants(),1);
    assert.equal((await h.recheck()).status,429,"one check per minute per account");
    const later=await h.ledger("recheck-candidates",{accountId:A.id,now:Date.now()+61000});
    assert.deepEqual(later.orders,[],"settled order is no longer a candidate");
    assert.equal(h.grants(),1,"never a second licence");
  }finally{globalThis.fetch=prior;h.db.close();}
});

test("not captured, wrong amount or PayU down never settles",async()=>{
  const prior=globalThis.fetch;
  try{
    {const h=harness();await h.addOrder(A,"XSAAAAAAAAAAAAAAAAAA02");
     payuSays({XSAAAAAAAAAAAAAAAAAA02:{status:"success",unmappedstatus:"auth"}});
     assert.deepEqual(await (await h.recheck()).json(),{ok:true,checked:1,settled:0,unavailable:false});
     assert.equal(h.status("XSAAAAAAAAAAAAAAAAAA02"),"pending");h.db.close();}
    {const h=harness();await h.addOrder(A,"XSAAAAAAAAAAAAAAAAAA03");
     payuSays({XSAAAAAAAAAAAAAAAAAA03:{status:"success",unmappedstatus:"captured",amt:"1.00"}});
     assert.equal((await (await h.recheck()).json()).settled,0,"amount mismatch");
     assert.equal(h.grants(),0);h.db.close();}
    {const h=harness();await h.addOrder(A,"XSAAAAAAAAAAAAAAAAAA04");
     payuSays(new Error("PayU down"));
     assert.deepEqual(await (await h.recheck()).json(),{ok:true,checked:1,settled:0,unavailable:true});
     assert.equal(h.status("XSAAAAAAAAAAAAAAAAAA04"),"pending");h.db.close();}
  }finally{globalThis.fetch=prior;}
});

test("another signed-in account can never see or settle someone else's order; old orders are ignored",async()=>{
  const h=harness();const prior=globalThis.fetch;
  try{
    await h.addOrder(A,"XSAAAAAAAAAAAAAAAAAA05");
    await h.addOrder(B,"XSBBBBBBBBBBBBBBBBBB06",new Date(Date.now()-15*86400000).toISOString());
    payuSays({XSAAAAAAAAAAAAAAAAAA05:{status:"success",unmappedstatus:"captured"},XSBBBBBBBBBBBBBBBBBB06:{status:"success",unmappedstatus:"captured"}});
    h.signIn(B);
    const r=await (await h.recheck()).json();
    assert.deepEqual(r,{ok:true,checked:0,settled:0,unavailable:false},"B's own order is older than 14 days; A's is invisible");
    assert.equal(h.status("XSAAAAAAAAAAAAAAAAAA05"),"pending");
    assert.equal(h.status("XSBBBBBBBBBBBBBBBBBB06"),"pending");
    assert.equal(h.grants(),0);
    assert.equal(JSON.stringify(r).includes("XSAAAA"),false,"no transaction ids returned");
  }finally{globalThis.fetch=prior;h.db.close();}
});
