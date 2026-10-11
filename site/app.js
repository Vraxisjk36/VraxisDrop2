const endpoint=window.VRAXIS_TRANSFER_ENDPOINT;
const feedback=document.getElementById("feedback");
async function transfer(data){
  if(!endpoint) throw Error("Backend is not configured yet. Set the Edge Function URL in config.js.");
  const response=await fetch(endpoint,{method:"POST",body:data});
  const payload=await response.json();
  if(!response.ok) throw Error(payload.error||"Transfer failed");
  return payload;
}
const send=document.getElementById("send");
if(send)send.addEventListener("submit",async event=>{
  event.preventDefault();const button=send.querySelector("button");button.disabled=true;feedback.textContent="Creating drop…";
  try{const data=new FormData(send);data.set("action","send");const result=await transfer(data);
    const url=new URL("retrieve.html",location.href);url.searchParams.set("code",result.code);
    send.innerHTML='<div class="small">DROP RELEASED</div><h2>It\'s <em>ready.</em></h2><div class="bigcode"></div><p>One-time pickup code. Expires in '+result.expires_hours+' hour(s).</p><input id="pickup-link" readonly><button type="button" id="copy-link">Copy pickup link</button>';
    send.querySelector(".bigcode").textContent=result.code;send.querySelector("#pickup-link").value=url.href;
    send.querySelector("#copy-link").onclick=()=>navigator.clipboard.writeText(url.href).then(()=>send.querySelector("#copy-link").textContent="Copied ✓");
  }catch(e){feedback.textContent=e.message;button.disabled=false;}
});
const pickup=document.getElementById("pickup");
if(pickup){
  const param=new URLSearchParams(location.search).get("code");if(param)document.getElementById("code").value=param;
  pickup.addEventListener("submit",async event=>{
    event.preventDefault();const button=pickup.querySelector("button");button.disabled=true;feedback.textContent="Retrieving…";
    try{const data=new FormData(pickup);data.set("action","pickup");const result=await transfer(data);
      if(result.kind==="text"){document.getElementById("message").textContent=result.content;document.getElementById("result").hidden=false;document.getElementById("copy").onclick=()=>navigator.clipboard.writeText(result.content);}
      else {const binary=atob(result.base64);const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([bytes]));link.download=result.filename||"download";link.click();setTimeout(()=>URL.revokeObjectURL(link.href),60000);}
      feedback.textContent="Drop retrieved. It can no longer be claimed.";
    }catch(e){feedback.textContent=e.message;}finally{button.disabled=false;}
  });
}
