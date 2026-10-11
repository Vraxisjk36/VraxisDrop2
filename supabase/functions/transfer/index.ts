// Supabase Edge Function. Deploy with JWT verification disabled: access is accountless.
// Configure TRANSFER_ORIGIN to the GitHub Pages origin. Keep service-role key server-side.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const corsOrigin = Deno.env.get("TRANSFER_ORIGIN") || "";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const encoder = new TextEncoder();
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json", "access-control-allow-origin":corsOrigin, "vary":"Origin", "cache-control":"no-store"}});
function code() {const b=crypto.getRandomValues(new Uint8Array(8)); return Array.from(b,x=>alphabet[x%alphabet.length]).join("");}
async function hash(s:string) {return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(s)))).map(x=>x.toString(16).padStart(2,"0")).join("");}
Deno.serve(async req => {
  const origin=req.headers.get("origin") || "";
  const headers={"access-control-allow-origin":corsOrigin,"access-control-allow-headers":"content-type","access-control-allow-methods":"POST, OPTIONS","vary":"Origin"};
  if(req.method==="OPTIONS") return new Response(null,{status:204,headers});
  if(req.method!=="POST") return json({error:"Method not allowed"},405);
  if(!corsOrigin || origin!==corsOrigin) return json({error:"Origin not allowed"},403);
  try {
    const form=await req.formData();
    const action=String(form.get("action")||"");
    if(action==="send") {
      const content=String(form.get("content")||"").trim();
      const file=form.get("file");
      const isFile=file instanceof File && file.size>0;
      if(!isFile && (!content || encoder.encode(content).length>100000)) return json({error:"Text must be 1–100,000 bytes"},400);
      if(isFile && file.size>10*1024*1024) return json({error:"File exceeds 10 MB"},400);
      const hours=form.get("expiry")==="24h"?24:1;
      const pickup=code();
      const path=isFile?crypto.randomUUID():null;
      if(isFile) {
        const {error}=await supabase.storage.from("vraxis-drops").upload(path!,file,{upsert:false,contentType:"application/octet-stream"});
        if(error) return json({error:"File upload failed"},500);
      }
      const {error}=await supabase.from("drops").insert({code_hash:await hash(pickup),kind:isFile?"file":"text",body:isFile?null:content,file_name:isFile?file.name.slice(0,180):null,storage_path:path,expires_at:new Date(Date.now()+hours*3600000).toISOString()});
      if(error){if(path) await supabase.storage.from("vraxis-drops").remove([path]);return json({error:"Unable to create drop"},500);}
      return json({code:pickup,expires_hours:hours});
    }
    if(action==="pickup"){
      const pickup=String(form.get("code")||"").replace(/[\s-]/g,"").toUpperCase();
      if(!/^[A-HJ-NP-Z2-9]{8}$/.test(pickup)) return json({error:"Invalid or expired code"},404);
      const {data,error}=await supabase.rpc("claim_drop",{p_hash:await hash(pickup)});
      if(error||!data?.length) return json({error:"Invalid or expired code"},404);
      const drop=data[0];
      if(drop.kind==="text") return json({kind:"text",content:drop.body});
      const {data:blob,error:downloadError}=await supabase.storage.from("vraxis-drops").download(drop.storage_path);
      if(downloadError||!blob) return json({error:"File unavailable"},410);
      await supabase.storage.from("vraxis-drops").remove([drop.storage_path]);
      const bytes=new Uint8Array(await blob.arrayBuffer());
      let binary=""; for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
      return json({kind:"file",filename:drop.file_name,base64:btoa(binary)});
    }
    return json({error:"Unknown action"},400);
  }catch{return json({error:"Request failed"},500);}
});
