const endpoint=window.VRAXIS_TRANSFER_ENDPOINT;
const feedback=document.getElementById("feedback");
async function transfer(data){
  if(!endpoint)throw Error("Transfer service is not configured.");
  const response=await fetch(endpoint,{method:"POST",body:data});
  const payload=await response.json();
  if(!response.ok)throw Error(payload.error||"Transfer failed. Please try again.");
  return payload;
}
const fileInput=document.getElementById("file"),fileZone=document.getElementById("file-zone");
function updateFile(){
  if(!fileInput)return;
  const file=fileInput.files[0];
  document.getElementById("file-title").textContent=file?file.name:"Choose a file or drop it here";
  document.getElementById("file-detail").textContent=file?(file.size/1048576).toFixed(2)+" MB selected · tap to change":"Images, documents and more · Up to 10 MB";
}
if(fileInput){fileInput.addEventListener("change",updateFile);if(fileZone){
  ["dragenter","dragover"].forEach(type=>fileZone.addEventListener(type,e=>{e.preventDefault();fileZone.classList.add("dragging")}));
  ["dragleave","drop"].forEach(type=>fileZone.addEventListener(type,e=>{e.preventDefault();fileZone.classList.remove("dragging")}));
  fileZone.addEventListener("drop",e=>{if(e.dataTransfer.files.length){fileInput.files=e.dataTransfer.files;updateFile()}});
}}
const send=document.getElementById("send");
if(send)send.addEventListener("submit",async event=>{
  event.preventDefault();
  const button=send.querySelector("button[type=submit]");button.disabled=true;feedback.textContent="Creating your drop…";
  try{
    const data=new FormData(send);data.set("action","send");
    const file=data.get("file");if(file instanceof File&&file.size>10485760)throw Error("Choose a file smaller than 10 MB.");
    const result=await transfer(data);
    const url=new URL("retrieve.html",location.href);url.searchParams.set("code",result.code);
    send.innerHTML='<div class="success-box"><div class="eyebrow" style="justify-content:center">Drop created</div><h3 class="panel-title" style="margin-top:25px">Ready to <em>go.</em></h3><p class="hint">Your one-time pickup code</p><div class="big-code" id="new-code"></div><p class="hint">Expires in '+result.expires_hours+' hour(s) or after the first retrieval.</p><input class="input" id="pickup-link" readonly aria-label="Pickup link"><button class="btn ember full" type="button" id="copy-link">Copy pickup link ↗</button><a class="btn ghost full" href="./#drop" style="margin-top:10px">Create another drop</a></div>';
    send.querySelector("#new-code").textContent=result.code;
    send.querySelector("#pickup-link").value=url.href;
    send.querySelector("#copy-link").addEventListener("click",async()=>{
      try{await navigator.clipboard.writeText(url.href);send.querySelector("#copy-link").textContent="Link copied ✓"}
      catch{send.querySelector("#pickup-link").select();send.querySelector("#copy-link").textContent="Select and copy the link above";}
    });
  }catch(e){feedback.textContent=e.message;button.disabled=false;}
});
const pickup=document.getElementById("pickup");
if(pickup){
  const param=new URLSearchParams(location.search).get("code");if(param)document.getElementById("code").value=param;
  pickup.addEventListener("submit",async event=>{
    event.preventDefault();
    const button=pickup.querySelector("button[type=submit]");button.disabled=true;feedback.textContent="Retrieving your drop…";
    try{
      const data=new FormData(pickup);data.set("action","pickup");
      const result=await transfer(data);
      if(result.kind==="text"){
        document.getElementById("message").textContent=result.content;
        document.getElementById("result").hidden=false;
        document.getElementById("copy").onclick=async()=>{await navigator.clipboard.writeText(result.content);document.getElementById("copy").textContent="Copied ✓"};
        feedback.textContent="Message retrieved. This code has been consumed.";
      }else{
        const binary=atob(result.base64),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
        const link=document.createElement("a");link.href=URL.createObjectURL(new Blob([bytes],{type:"application/octet-stream"}));link.download=result.filename||"download";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),60000);
        feedback.textContent="File retrieved. Your download should begin automatically.";
      }
    }catch(e){feedback.textContent=e.message;}finally{button.disabled=false;}
  });
}
