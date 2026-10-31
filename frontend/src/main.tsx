import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { routes } from "../generated/routes";
import { AppShell } from "../generated/app-shell";
import AuthLayout from "@/app/(auth)/layout";
import PublicLayout from "@/app/(public)/layout";
import NotFound from "@/app/not-found";
import Loading from "@/app/(app)/loading";
import { API_BASE, apiFetch, download, runtime, sessionToken, verifyEmail } from "./api";
import { NavigationSignal, navigate, useLocation } from "./navigation";
import "./style.css";

class ScreenBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Unable to show this screen</h1><button className="mt-4 underline" onClick={()=>window.location.reload()}>Reload</button></div>:this.props.children;}
}
function matchRoute(pathname:string) {
  for(const route of routes){
    const pattern=route.path.split("/").filter(Boolean),parts=pathname.split("/").filter(Boolean);
    if(pattern.length!==parts.length)continue;
    const params:Record<string,string>={};
    if(pattern.every((part,i)=>part.startsWith("[")?(params[part.slice(1,-1)]=decodeURIComponent(parts[i]),true):part===parts[i]))return {route,params};
  }
  return null;
}
function App(){
  const location=useLocation();
  const [screen,setScreen]=useState<ReactNode>(null);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState("");
  const lastPath=useRef("");
  useEffect(()=>{
    let cancelled=false;
    const current=matchRoute(window.location.pathname);
    queueMicrotask(()=>{if(!cancelled){setBusy(true);setError("");}});
    async function load(){
      if(!current){setScreen(<NotFound/>);setBusy(false);return;}
      const {route,params}=current;
      const search=Object.fromEntries(new URLSearchParams(window.location.search));
      if(route.id==="(auth)/verify-email"&&search.token){
        await verifyEmail(search.token);return;
      }
      if(!sessionToken()){runtime.user=null;runtime.shell=null;}
      else if(route.guestData!==null&&route.id!=="(auth)/login"&&route.id!=="(public)"){
        const response=await apiFetch("/api/client/session");
        if(response.ok)runtime.user=(await response.json()).user;
      }
      const pageModule=await route.load();
      const view=await pageModule.default({params:Promise.resolve(params),searchParams:Promise.resolve(search)});
      let content:ReactNode=view;
      if(route.layout==="user"||route.layout==="admin"){
        if(!runtime.user)throw new NavigationSignal("/login");
        content=<AppShell user={runtime.user} section={route.layout}>{view}</AppShell>;
      }else if(route.layout==="auth")content=<AuthLayout>{view}</AuthLayout>;
      else content=await PublicLayout({children:view});
      if(cancelled)return;
      setScreen(content);
      const metadata="metadata" in pageModule ? pageModule.metadata as {title?:unknown} : undefined;
      const title=metadata?.title;
      document.title=typeof title==="string"?title+" · Track-and-Trace":"Track-and-Trace";
      setBusy(false);
      if(lastPath.current!==window.location.pathname){
        lastPath.current=window.location.pathname;
        requestAnimationFrame(()=>window.location.hash?document.getElementById(window.location.hash.slice(1))?.scrollIntoView():window.scrollTo(0,0));
      }
    }
    load().catch(e=>{
      if(cancelled)return;
      if(e instanceof NavigationSignal){
        if(e.missing){setScreen(<NotFound/>);setBusy(false);}
        else navigate(e.destination,true);
      }else {setError(e instanceof Error?e.message:"Unable to load this screen.");setBusy(false);}
    });
    return ()=>{cancelled=true;};
  },[location]);
  useEffect(()=>{
    const onClick=(event:MouseEvent)=>{
      const anchor=(event.target as Element)?.closest("a");
      if(!anchor||event.defaultPrevented||!anchor.getAttribute("href")?.startsWith("/api/"))return;
      event.preventDefault();
      download(anchor.getAttribute("href")!,anchor.target==="_blank").catch(e=>setError(e.message));
    };
    const onSubmit=(event:SubmitEvent)=>{
      const form=event.target as HTMLFormElement;
      if(event.defaultPrevented||form.method.toLowerCase()!=="get"||form.getAttribute("action")?.startsWith("javascript:"))return;
      event.preventDefault();
      const query=new URLSearchParams();
      for(const [key,value]of new FormData(form))if(typeof value==="string")query.append(key,value);
      navigate(window.location.pathname+"?"+query);
    };
    document.addEventListener("click",onClick,true);
    document.addEventListener("submit",onSubmit);
    return ()=>{document.removeEventListener("click",onClick,true);document.removeEventListener("submit",onSubmit);};
  },[]);
  return <>
    {busy&&<div role="status" aria-label="Loading" className="fixed inset-x-0 top-0 z-[100] h-1 animate-pulse bg-amber"><span className="sr-only">Loading…</span></div>}
    {error&&<div role="alert" className="mx-auto my-6 max-w-2xl rounded-2xl border border-line bg-paper p-5"><p>{error}</p><button className="mt-2 font-semibold underline" onClick={()=>window.location.reload()}>Try again</button></div>}
    <div className="contents" key={window.location.pathname+window.location.search}>
      {screen??<div className="mx-auto w-full max-w-6xl p-6"><Loading/></div>}
    </div>
  </>;
}
window.addEventListener("unhandledrejection",event=>console.error(event.reason));
createRoot(document.getElementById("root")!).render(<ScreenBoundary><App/></ScreenBoundary>);
if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});
void API_BASE;
