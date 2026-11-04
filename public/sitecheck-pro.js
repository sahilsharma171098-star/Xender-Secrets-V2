(() => {
  const $=id=>document.getElementById(id);
  const buy=$("sitecheckBuy"),buyForm=$("sitecheckPurchase");
  const status=(id,text)=>{ $(id).textContent=text; };
  let enabled=false, account=null;
  // The URL query is only a prompt to check the server; never proof of a payment.
  const paymentState=new URLSearchParams(location.search).get("payment");
  if(paymentState==="failed"){
    status("licenseStatus","The payment was not completed, so no license was issued. You can try again. If money was deducted, contact us with the time of payment and we will check it with PayU.");
  }
  if(paymentState==="verified"||paymentState==="pending"){
    status("licenseStatus","Checking the captured payment and your account entitlement…");
    fetch("/api/sitecheck/entitlement",{credentials:"same-origin",cache:"no-store"})
      .then(async response=>{
        if(response.status===401)throw new Error("Sign in to your purchasing Xender account to restore your Pro license.");
        if(!response.ok)throw new Error("License lookup unavailable; use the same account email and retry.");
        const result=await response.json();
        if(result.ok===true&&result.pro===true){
          status("licenseStatus","Payment confirmed for this Xender account. Select Generate a license key, then activate it in SiteCheck.");
          $("sitecheckLicenseIssue").focus();
        }else{ $("sitecheckRecheck").hidden=false; status("licenseStatus",paymentState==="pending"
          ?"We could not confirm this payment yet, so no license has been issued. If money left your account it will be confirmed here or reversed. Check this page again in a few minutes, or contact us with the time of payment."
          :"Your payment is still being verified. No license has been issued yet. Please check again or contact support."); }
      })
      .catch(error=>status("licenseStatus",error.message||"Unable to verify entitlement right now."));
  }
  Promise.all([
    fetch("/api/payu/config",{headers:{accept:"application/json"},credentials:"same-origin"})
      .then(async r=>{if(!r.ok)throw Error("Payment gateway unavailable");return r.json()}),
    fetch("/api/auth/me",{credentials:"same-origin"})
      .then(async r=>r.ok?(await r.json()).user:null)
      .catch(()=>null)
  ]).then(([data,user])=>{
    if(data.sitecheck?.amountPaise!==49900||data.sitecheck.currency!=="INR")throw Error("SiteCheck price mismatch");
    account=user?.id&&user.email?user:null;
    enabled=data.sitecheck.checkoutEnabled===true&&Boolean(account);
    buy.disabled=!enabled;
    buy.textContent=enabled?"Pay ₹499 securely with PayU":"SiteCheck Pro checkout not yet available";
    if(account){
      $("buyerName").value=String(account.name||"").slice(0,60);
      $("buyerEmail").value=String(account.email||"").toLowerCase();
      $("buyerEmail").readOnly=true;
    }
    status("checkoutStatus",!account?
      "Sign in to your Xender account first. Payments require a signed-in account to protect your Pro license.":
      enabled?"Secure PayU checkout is available for your signed-in account.":"Payments remain disabled until fulfillment verification is complete.");
  }).catch(()=>{buy.disabled=true;enabled=false;status("checkoutStatus","Secure checkout is not available right now. No payment was attempted.")});
  buyForm.addEventListener("submit",async ev=>{
    ev.preventDefault();if(!enabled||!account?.id)return;
    buy.disabled=true;status("checkoutStatus","Creating secure PayU transaction…");
    const b=Object.fromEntries(new FormData(buyForm).entries());
    b.email=String(account.email).toLowerCase();
    try{
      const resp=await fetch("/api/payu/initiate",{method:"POST",headers:{"content-type":"application/json"},credentials:"same-origin",body:JSON.stringify({...b,offer:"sitecheck-pro-onetime"})});
      const data=await resp.json();
      if(!resp.ok||!data.ok||data.url!=="https://secure.payu.in/_payment"||!data.fields?.hash)throw Error(data.error||"Payment not available");
      const form=document.createElement("form");form.method="POST";form.action=data.url;form.hidden=true;
      for(const [key,value] of Object.entries(data.fields)){
        const input=document.createElement("input");input.type="hidden";input.name=key;input.value=String(value);form.append(input);
      }
      document.body.append(form);
      status("checkoutStatus","Redirecting to secure PayU checkout…");
      form.submit();
    }catch(error){status("checkoutStatus",error.message||"Could not start checkout");buy.disabled=false}
  });
  $("sitecheckLicenseIssue").addEventListener("click",async()=>{
    $("sitecheckLicenseIssue").disabled=true;
    status("licenseStatus","Checking your signed-in account and purchase…");
    $("issuedKey").value="";$("copyIssuedKey").disabled=true;
    try{
      const resp=await fetch("/api/sitecheck/license/issue",{method:"POST",headers:{"content-type":"application/json"},body:"{}",credentials:"same-origin"});
      const data=await resp.json();
      if(!resp.ok||!data.licenseKey)throw Error(data.error||"Could not generate a license key");
      $("issuedKey").value=data.licenseKey;
      $("copyIssuedKey").disabled=false;
      status("licenseStatus","Pro key generated. Copy it into your SiteCheck extension. This invalidates older keys.");
    }catch(error){
      status("licenseStatus",error.message||"License service unavailable. Check your account email.");
      $("sitecheckRecheck").hidden=false; // paid but not confirmed yet? let the customer ask PayU again
    }
    finally{$("sitecheckLicenseIssue").disabled=false}
  });
  // Self-serve re-check: asks PayU again about this account's own unconfirmed payment.
  // The server decides; the page only reports what the server says.
  $("sitecheckRecheck").addEventListener("click",async()=>{
    const button=$("sitecheckRecheck");
    button.disabled=true;
    status("licenseStatus","Asking PayU about your payment…");
    try{
      const resp=await fetch("/api/payu/recheck",{method:"POST",headers:{"content-type":"application/json"},body:"{}",credentials:"same-origin"});
      const data=await resp.json().catch(()=>({}));
      if(!resp.ok||!data.ok)throw Error(data.error||"Could not check the payment right now.");
      if(data.settled>0){
        button.hidden=true;
        status("licenseStatus","Payment confirmed for this Xender account. Select Generate a license key, then activate it in SiteCheck.");
        $("sitecheckLicenseIssue").focus();
      }else if(data.unavailable){
        status("licenseStatus","PayU could not be reached just now. Please try again in a few minutes.");
      }else if(data.checked===0){
        status("licenseStatus","No unconfirmed SiteCheck payment was found on this account in the last 14 days. Check you are signed in with the email you paid with.");
      }else{
        status("licenseStatus","PayU has not confirmed this payment yet, so no license has been issued. If money left your account it will be confirmed or reversed. Try again later or contact us with the time of payment.");
      }
    }catch(error){status("licenseStatus",error.message||"Could not check the payment right now.")}
    finally{button.disabled=false}
  });
  $("copyIssuedKey").addEventListener("click",async()=>{
    try{await navigator.clipboard.writeText($("issuedKey").value);status("licenseStatus","Copied your key. Paste it into the SiteCheck popup.")}
    catch{status("licenseStatus","Copy blocked by browser. Select and copy the key manually.")}
  });
})();