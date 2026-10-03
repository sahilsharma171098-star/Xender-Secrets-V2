const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});

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
