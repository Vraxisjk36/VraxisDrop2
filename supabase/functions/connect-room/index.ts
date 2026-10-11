import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const origin="https://vraxisjk36.github.io";
const headers={"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"content-type","Content-Type":"application/json","Cache-Control":"no-store"};
const db=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const abc="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function random(n:number){const a=new Uint8Array(n);crypto.getRandomValues(a);return [...a].map(x=>abc[x%abc.length]).join("")}
function secret(){return crypto.randomUUID()+crypto.randomUUID()}
async function hash(s:string){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,"0")).join("")}
function reply(body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers})}
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers});
 if(req.method!=="POST")return reply({error:"Method not allowed"},405);
 const requestOrigin=req.headers.get("origin");if(requestOrigin&&requestOrigin!==origin)return reply({error:"Origin not allowed"},403);
 try{
 const body=await req.json();const action=body.action;
 if(action==="create"){
  const host=secret(),invite=secret(),code=random(8);
  const {data,error}=await db.from("connect_rooms").insert({host_hash:await hash(host),invite_hash:await hash(invite),code_hash:await hash(code)}).select("id,expires_at").single();
  if(error)throw error;return reply({room_id:data.id,host_token:host,invite,code,expires_at:data.expires_at});
 }
 if(action==="join"){
  const invite=String(body.invite||"");const code=String(body.code||"").toUpperCase().replace(/\s/g,"");
  if((invite.length<40||invite.length>120)&&!/^[A-HJ-NP-Z2-9]{8}$/.test(code))return reply({error:"Invalid invitation"},400);
  const lookup=invite.length>=40?{invite_hash:await hash(invite)}:{code_hash:await hash(code)};
  let query=db.from("connect_rooms").select("id,expires_at,closed_at").eq(Object.keys(lookup)[0],Object.values(lookup)[0]).is("closed_at",null).gt("expires_at",new Date().toISOString());
  const {data:room}=await query.maybeSingle();if(!room)return reply({error:"Room unavailable or invitation expired"},404);
  const {count}=await db.from("connect_join_requests").select("id",{count:"exact",head:true}).eq("room_id",room.id).in("status",["pending","approved"]);
  if((count||0)>=1)return reply({error:"This room already has a joining device"},409);
  const guest=secret();const {data,error}=await db.from("connect_join_requests").insert({room_id:room.id,guest_hash:await hash(guest)}).select("id").single();
  if(error)throw error;return reply({request_id:data.id,guest_token:guest,room_id:room.id,status:"pending"});
 }
 if(["host_status","approve","deny","close"].includes(action)){
  const roomId=String(body.room_id||"");const host=String(body.host_token||"");
  const {data:room}=await db.from("connect_rooms").select("id,expires_at,closed_at").eq("id",roomId).eq("host_hash",await hash(host)).maybeSingle();
  if(!room)return reply({error:"Unauthorized room access"},403);
  if(action==="close"){await db.from("connect_rooms").update({closed_at:new Date().toISOString()}).eq("id",roomId);return reply({status:"closed"})}
  if(room.closed_at||new Date(room.expires_at)<new Date())return reply({status:"expired"});
  if(action==="host_status"){
   const {data:requests}=await db.from("connect_join_requests").select("id,status,created_at").eq("room_id",roomId).order("created_at",{ascending:false}).limit(1);
   return reply({status:"active",request:requests?.[0]||null,expires_at:room.expires_at});
  }
  const status=action==="approve"?"approved":"denied";
  const {data,error}=await db.from("connect_join_requests").update({status}).eq("id",String(body.request_id||"")).eq("room_id",roomId).eq("status","pending").select("id").maybeSingle();
  if(error)throw error;if(!data)return reply({error:"Request is no longer pending"},409);return reply({status});
 }
 if(action==="signal_send"||action==="signal_poll"){
  const role=body.role==="host"?"host":body.role==="guest"?"guest":null;
  if(!role)return reply({error:"Invalid role"},400);
  const roomId=String(body.room_id||""),token=String(body.token||"");
  const {data:room}=await db.from("connect_rooms").select("id,closed_at,expires_at,host_hash").eq("id",roomId).maybeSingle();
  if(!room||room.closed_at||new Date(room.expires_at)<new Date())return reply({error:"Room closed or expired"},403);
  if(role==="host"){if(room.host_hash!==await hash(token))return reply({error:"Unauthorized"},403)}
  else{
   const {data:guest}=await db.from("connect_join_requests").select("id").eq("room_id",roomId).eq("guest_hash",await hash(token)).eq("status","approved").maybeSingle();
   if(!guest)return reply({error:"Device not approved"},403);
  }
  if(action==="signal_send"){
   const payload=body.payload;
   if(!payload||typeof payload!=="object"||JSON.stringify(payload).length>20000)return reply({error:"Invalid signal"},400);
   const {error}=await db.from("connect_signals").insert({room_id:roomId,sender:role,payload});
   if(error)throw error;return reply({ok:true});
  }
  const after=Math.max(0,Number(body.after)||0);
  const {data,error}=await db.from("connect_signals").select("id,payload").eq("room_id",roomId).neq("sender",role).gt("id",after).order("id",{ascending:true}).limit(100);
  if(error)throw error;return reply({messages:data||[]});
 }
 if(action==="guest_status"){
  const guest=String(body.guest_token||"");const {data:request}=await db.from("connect_join_requests").select("status,room_id").eq("id",String(body.request_id||"")).eq("guest_hash",await hash(guest)).maybeSingle();
  if(!request)return reply({error:"Unauthorized request"},403);
  const {data:room}=await db.from("connect_rooms").select("expires_at,closed_at").eq("id",request.room_id).single();
  return reply({status:room?.closed_at||new Date(room?.expires_at||0)<new Date()?"expired":request.status});
 }
 return reply({error:"Unknown action"},400);
 }catch(e){console.error("connect failure",e);return reply({error:"Unable to complete request"},500)}
});
