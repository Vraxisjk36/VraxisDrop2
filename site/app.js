
const E2EE_TEXT="vraxis:e2ee:v1:";
const E2EE_FILE="vraxis-encrypted-v1.bin";
const enc=new TextEncoder(),dec=new TextDecoder();
function toB64(bytes){let out="";for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out)}
function fromB64(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0))}
function b64url(bytes){return toB64(bytes).split("+").join("-").split("/").join("_").replace(/=+$/,"")}
function unb64url(s){return fromB64(s.replace(/-/g,"+").replace(/_/g,"/"))}
async function encryptDrop(plaintext,keyBytes){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await crypto.subtle.importKey("raw",keyBytes,"AES-GCM",false,["encrypt"]);
 const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,plaintext));
 const out=new Uint8Array(1+iv.length+ciphertext.length);out[0]=1;out.set(iv,1);out.set(ciphertext,13);return out;
}
async function decryptDrop(payload,keyBytes){
 if(payload[0]!==1||payload.length<30)throw Error("Unsupported encrypted drop");
 const key=await crypto.subtle.importKey("raw",keyBytes,"AES-GCM",false,["decrypt"]);
 try{return new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:payload.slice(1,13)},key,payload.slice(13)))}
 catch{throw Error("Unable to decrypt. The link or encryption key may be incorrect.")}
}
function getLinkKey(){
 const fragment=new URLSearchParams(location.hash.slice(1)).get("key");
 if(!fragment)return null;
 try{const bytes=unb64url(fragment);if(bytes.length!==32)throw Error();return bytes}
 catch{throw Error("Invalid encryption key in link.")}
}
function saveFile(bytes,name){
 const link=document.createElement("a");
 link.href=URL.createObjectURL(new Blob([bytes],{type:"application/octet-stream"}));
 link.download=name||"download";document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(link.href),60000);
}

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
    const file=data.get("file");const isFile=file instanceof File&&file.size>0;
    if(isFile&&file.size>9*1048576)throw Error("Encrypted files must be smaller than 9 MB.");
    if(!isFile&&enc.encode(String(data.get("content")||"")).length>65000)throw Error("Encrypted messages must be under 65 KB.");
    const keyBytes=crypto.getRandomValues(new Uint8Array(32));
    if(isFile){
      const nameBytes=enc.encode(file.name);
      if(nameBytes.length>1024)throw Error("File name is too long.");
      const bytes=new Uint8Array(await file.arrayBuffer());
      const plain=new Uint8Array(2+nameBytes.length+bytes.length);
      plain[0]=nameBytes.length>>8;plain[1]=nameBytes.length&255;
      plain.set(nameBytes,2);plain.set(bytes,2+nameBytes.length);
      const cipher=await encryptDrop(plain,keyBytes);
      data.set("file",new File([cipher],E2EE_FILE,{type:"application/octet-stream"}));
      data.set("content","");
    }else{
      const content=String(data.get("content")||"").trim();
      if(!content)throw Error("Enter a message or select a file.");
      const cipher=await encryptDrop(enc.encode(content),keyBytes);
      const value=E2EE_TEXT+toB64(cipher);
      if(enc.encode(value).length>100000)throw Error("Encrypted message exceeds the size limit.");
      data.set("content",value);data.delete("file");
    }
    const result=await transfer(data);
    const url=new URL("retrieve.html",location.href);url.searchParams.set("code",result.code);
    url.hash="key="+b64url(keyBytes);
    send.innerHTML='<div class="success-box"><div class="eyebrow" style="justify-content:center">Drop created</div><h3 class="panel-title" style="margin-top:25px">Ready to <em>go.</em></h3><p class="hint">Your one-time pickup code</p><div class="big-code" id="new-code"></div><p class="hint">End-to-end encrypted. Share the complete link: the eight-character code alone cannot decrypt this drop. Expires in '+result.expires_hours+' hour(s) or after the first retrieval.</p><input class="input" id="pickup-link" readonly aria-label="Pickup link"><button class="btn ember full" type="button" id="copy-link">Copy pickup link ↗</button><a class="btn ghost full" href="./#drop" style="margin-top:10px">Create another drop</a></div>';
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
      const keyBytes=getLinkKey();
      if(result.kind==="text"){
        const encrypted=String(result.content||"").startsWith(E2EE_TEXT);
        if(encrypted&&!keyBytes)throw Error("This encrypted drop needs its full pickup link, including the key.");
        const content=encrypted?dec.decode(await decryptDrop(fromB64(result.content.slice(E2EE_TEXT.length)),keyBytes)):result.content;
        document.getElementById("message").textContent=content;
        document.getElementById("result").hidden=false;
        document.getElementById("copy").onclick=async()=>{await navigator.clipboard.writeText(content);document.getElementById("copy").textContent="Copied ✓"};
        feedback.textContent="Message retrieved. This code has been consumed.";
      }else{
        let bytes=fromB64(result.base64),name=result.filename||"download";
        if(name===E2EE_FILE){
          if(!keyBytes)throw Error("This encrypted file needs its full pickup link, including the key.");
          const plain=await decryptDrop(bytes,keyBytes);
          const n=(plain[0]<<8)|plain[1];if(n<1||n>1024||n+2>plain.length)throw Error("Invalid encrypted file");
          name=dec.decode(plain.slice(2,2+n)).replace(/[\\\\/]/g,"_");
          bytes=plain.slice(2+n);
        }
        saveFile(bytes,name);
        feedback.textContent="File retrieved. Your download should begin automatically.";
      }
    }catch(e){feedback.textContent=e.message;}finally{button.disabled=false;}
  });
}
