import {createClient} from "https://esm.sh/@supabase/supabase-js@2.57.0";
const client=createClient("https://hvidmmthnragwxcywppt.supabase.co","sb_publishable_2lPMMrHLikazMrhnt7GN8Q_9r8gcwX7");
const endpoint="https://hvidmmthnragwxcywppt.supabase.co/functions/v1/collect";
const $=id=>document.getElementById(id);
const status=(id,text,error=false)=>{const el=$(id);el.textContent=text;el.classList.toggle("error",error)};
async function call(action,fields={},auth=false){
 const form=new FormData();form.append("action",action);
 for(const [k,v] of Object.entries(fields))form.append(k,v);
 const headers={};
 if(auth){const {data:{session}}=await client.auth.getSession();if(!session)throw Error("Sign in first");headers.authorization="Bearer "+session.access_token}
 const res=await fetch(endpoint,{method:"POST",body:form,headers});
 const data=await res.json().catch(()=>({error:"Server returned an invalid response"}));
 if(!res.ok)throw Error(data.error||"Request failed");
 return data;
}
const urlFor=token=>new URL("collect.html?box="+encodeURIComponent(token),location.href).href;
function element(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e}
async function loadCollections(){
 const data=await call("list",{},true),container=$("collections");container.replaceChildren();
 for(const box of data.collections||[]){
  const item=element("div");item.className="item";
  item.append(element("strong",box.title));
  item.append(element("p",box.submission_count+" files · "+(box.used_bytes/1048576).toFixed(1)+" / 50 MB · expires "+new Date(box.expires_at).toLocaleDateString()+(box.closed_at?" · closed":"")));
  if(!box.closed_at&&new Date(box.expires_at)>new Date()){
   const link=element("p",urlFor(box.public_token));link.className="muted result";item.append(link);
   const copy=element("button","Copy collection link");copy.type="button";copy.className="btn";copy.onclick=async()=>{try{await navigator.clipboard.writeText(urlFor(box.public_token));status("owner-status","Collection link copied")}catch{status("owner-status","Copy failed. Select the link above.",true)}};item.append(copy);
  }
  const filesBtn=element("button","View submissions");filesBtn.type="button";filesBtn.className="btn";item.append(filesBtn);
  const files=element("div");item.append(files);
  filesBtn.onclick=async()=>{
   try{files.replaceChildren();const data=await call("files",{id:box.id},true);
    if(!data.files?.length){files.append(element("p","No submissions yet."));return}
    for(const file of data.files){const line=element("div");line.className="item";line.append(element("span",file.filename+" ("+(file.bytes/1048576).toFixed(2)+" MB) "));
     const btn=element("button","Download");btn.type="button";btn.className="btn";btn.onclick=async()=>{try{const result=await call("download",{id:box.id,file_id:file.id},true);window.open(result.url,"_blank","noopener,noreferrer")}catch(e){status("owner-status",e.message,true)}};line.append(btn);files.append(line)}
   }catch(e){status("owner-status",e.message,true)}
  };
  if(!box.closed_at){const close=element("button","Close collection");close.type="button";close.className="btn";close.onclick=async()=>{if(!confirm("Stop accepting new uploads? Existing submissions remain available until cleanup."))return;try{await call("close",{id:box.id},true);await loadCollections()}catch(e){status("owner-status",e.message,true)}};item.append(close)}
  container.append(item);
 }
 if(!(data.collections||[]).length)container.append(element("p","No collections yet. Create your first one above."));
}
async function init(){
 const token=new URL(location.href).searchParams.get("box");
 if(token){
  try{const box=await call("inspect",{token});$("box-title").textContent="Upload to: "+box.title+" · closes "+new Date(box.expires_at).toLocaleString();$("upload-form").classList.remove("hidden");
   $("upload-form").onsubmit=async event=>{event.preventDefault();const file=$("upload-file").files[0];if(!file)return;
    if(file.size>10485760){status("upload-status","File exceeds 10 MB",true);return}
    const btn=$("upload-form").querySelector("button");btn.disabled=true;status("upload-status","Uploading…");
    try{const data=await call("upload",{token,file});status("upload-status","Uploaded: "+data.filename);$("upload-form").reset()}catch(e){status("upload-status",e.message,true)}finally{btn.disabled=false}
   };
  }catch(e){status("upload-status",e.message,true)}
 }
 const {data:{user}}=await client.auth.getUser();
 $("signed-out").classList.toggle("hidden",!!user);
 $("signed-in").classList.toggle("hidden",!user);
 if(user){try{await loadCollections()}catch(e){status("owner-status",e.message,true)}}
 $("create-form").onsubmit=async event=>{event.preventDefault();const btn=$("create-form").querySelector("button");btn.disabled=true;try{await call("create",{title:$("title").value.trim()},true);$("create-form").reset();status("owner-status","Collection created");await loadCollections()}catch(e){status("owner-status",e.message,true)}finally{btn.disabled=false}};
}
init().catch(e=>status("owner-status",e.message,true));
