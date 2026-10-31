import type { SessionUser } from "@/lib/session";
import type { NavCounts } from "@/components/nav-links";
import type { ClientPageProps } from "./types";
import { navigate, NavigationSignal, notifyNavigation } from "./navigation";

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "https://track-and-trace-ucp.vercel.app").replace(/\/$/,"");
const TOKEN_KEY="track-and-trace-session";
export const runtime: {user:SessionUser|null;shell:{unread:number;counts:NavCounts}|null;cloudName:string} =
  {user:null,shell:null,cloudName:""};
export function sessionToken() { return localStorage.getItem(TOKEN_KEY); }
function saveToken(token: string|null) {
  if(token)localStorage.setItem(TOKEN_KEY,token);else localStorage.removeItem(TOKEN_KEY);
}
export async function apiFetch(url:string,options:RequestInit={}) {
  const headers=new Headers(options.headers);
  const token=sessionToken();
  if(token)headers.set("Authorization","Bearer "+token);
  const response=await fetch(API_BASE+url,{...options,headers,credentials:"omit"});
  const changed=response.headers.get("set-auth-token");
  if(changed)saveToken(changed);
  return response;
}
function revive(_key:string,value:unknown):unknown {
  if(!value||typeof value!=="object")return value;
  const tagged=value as {$type?:string;value?:string;entries?:[unknown,unknown][];values?:unknown[]};
  if(tagged.$type==="Date")return new Date(tagged.value!);
  if(tagged.$type==="Map")return new Map(tagged.entries);
  if(tagged.$type==="Set")return new Set(tagged.values);
  return value;
}
export async function loadPage<T>(id:string,props:ClientPageProps):Promise<T> {
  if(!sessionToken()&&(id==="(public)"||id==="(auth)/login")){runtime.user=null;return {user:null} as T;}
  const query=new URLSearchParams({id,params:JSON.stringify(await props.params),search:JSON.stringify(await props.searchParams)});
  const response=await apiFetch("/api/client/page?"+query);
  const payload=JSON.parse(await response.text(),revive);
  if(payload.redirect) {
    if(response.status===401){saveToken(null);runtime.user=null;}
    throw new NavigationSignal(payload.redirect);
  }
  if(payload.notFound)throw new NavigationSignal("",true);
  if(!response.ok)throw new Error(payload.error||"Unable to load this page.");
  runtime.user=payload.user;runtime.shell=payload.shell;runtime.cloudName=payload.cloudName;
  return payload.data;
}
export async function invokeAction(id:string,args:unknown[]):Promise<never|Record<string,unknown>|undefined> {
  const body=new FormData();
  body.set("$action",id);
  body.set("$args",JSON.stringify(args.map((arg,index)=>{
    if(!(arg instanceof FormData))return arg;
    for(const [key,value]of arg)body.append("$form"+index+":"+key,value);
    return {$form:true};
  })));
  const response=await apiFetch("/api/client/action",{method:"POST",body});
  const payload=JSON.parse(await response.text(),revive);
  if(!response.ok)throw new Error(payload.error||"The action failed.");
  if(payload.sessionToken)saveToken(payload.sessionToken);
  if(payload.redirect) {
    if(id.endsWith(":logoutAction")||id.endsWith(":deactivateAccountAction")){saveToken(null);runtime.user=null;}
    navigate(payload.redirect);
  } else notifyNavigation();
  // A server redirect has no result; action-state forms still need an object
  // while the next screen loads, rather than rendering an undefined state.
  return payload.result ?? {};
}
export async function verifyEmail(token:string) {
  const response=await apiFetch("/api/client/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token})});
  if(!response.ok)throw new Error("This verification link is invalid or has expired.");
  navigate(sessionToken()?"/dashboard":"/login?verified=1",true);
}
export async function getSessionUser(){return runtime.user;}
export async function requireUser(){if(!runtime.user)throw new NavigationSignal("/login");return runtime.user;}
export async function requireAdmin(){const user=await requireUser();if(user.role!=="admin")throw new NavigationSignal("/dashboard");return user;}
export function isAdmin(user:SessionUser|null){return user?.role==="admin";}
export function photoUrl(stored:string,opts:{blurred?:boolean;width?:number}={}) {
  if(stored.startsWith("cld:")){
    const id=stored.split(":").slice(2).join(":");
    return "https://res.cloudinary.com/"+runtime.cloudName+"/image/upload/w_"+(opts.width??800)+",c_limit,q_auto,f_auto"+(opts.blurred?",e_blur:900":"")+"/"+id;
  }
  return API_BASE+"/uploads/"+stored.replace(/^local:/,"");
}
export async function download(href:string,openInNewTab=false) {
  const url=new URL(href,window.location.origin);
  let target:string;
  if(url.pathname.startsWith("/api/files/proof/"))target="/api/client/download/proof/"+url.pathname.split("/").pop();
  else if(url.pathname==="/api/me/export")target="/api/client/download/me";
  else if(url.pathname==="/api/admin/export")target="/api/client/download/admin"+url.search;
  else return;
  const proofWindow=openInNewTab?window.open("about:blank","_blank"):null;
  if(proofWindow)proofWindow.opener=null;
  const response=await apiFetch(target);
  if(!response.ok){proofWindow?.close();throw new Error("You do not have access to this download.");}
  if(response.headers.get("content-type")?.includes("application/json")&&url.pathname.includes("/proof/")){
    const {url:remote}=await response.json();
    if(proofWindow)proofWindow.location.href=remote;else window.location.assign(remote);
    return;
  }
  const blob=await response.blob();
  if(proofWindow){const objectUrl=URL.createObjectURL(blob);proofWindow.location.href=objectUrl;setTimeout(()=>URL.revokeObjectURL(objectUrl),60_000);return;}
  const link=document.createElement("a");
  link.href=URL.createObjectURL(blob);
  link.download=/filename="?([^";]+)/.exec(response.headers.get("content-disposition")??"")?.[1]??(url.pathname.includes("/proof/")?"proof":url.pathname.includes("/me/")?"my-data.json":"records.csv");
  link.click();
  setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
