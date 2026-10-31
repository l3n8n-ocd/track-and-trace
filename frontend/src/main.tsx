import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { matchRoute } from "./routes";
import { loadLayout, type Section } from "./layouts";
import NotFound from "@/app/not-found";
import Loading from "@/app/(app)/loading";
import { activatePage, cachedPage, currentPage, download, invalidatePageData, onSessionStorage, requestPage, requestSession, runtime, sessionToken, verifyEmail, type PageSnapshot } from "./api";
import type { ClientPageProps } from "./types";
import { NavigationSignal, navigate, notifyNavigation, useLocation } from "./navigation";
import "./style.css";

class ScreenBoundary extends Component<{children:ReactNode},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-bold">Unable to show this screen</h1><button className="mt-4 underline" onClick={()=>window.location.reload()}>Reload</button></div>:this.props.children;}
}
function App(){
  const location=useLocation();
  const [screen,setScreen]=useState<{key:string;content:ReactNode}|null>(null);
  const [busy,setBusy]=useState(true);
  const [error,setError]=useState("");
  const lastPath=useRef("");
  useEffect(()=>{
    let cancelled=false;
    const controller=new AbortController();
    const screenKey=window.location.pathname+window.location.search;
    const current=matchRoute(window.location.pathname);
    queueMicrotask(()=>{if(!cancelled){setBusy(true);setError("");}});
    async function load(){
      if(!current){setScreen({key:screenKey,content:<NotFound/>});setBusy(false);return;}
      const {route,params}=current;
      const search=Object.fromEntries(new URLSearchParams(window.location.search));
      if(route.id==="(auth)/verify-email"&&search.token){
        await verifyEmail(search.token);return;
      }
      if(!sessionToken()){runtime.user=null;runtime.shell=null;}
      const props:ClientPageProps={params:Promise.resolve(params),searchParams:Promise.resolve(search)};
      const cached=route.serverData?cachedPage(route.id,params,search):undefined;
      // Start the API request while destination code and its layout download.
      const fresh=route.serverData?requestPage(route.id,props,controller.signal)
        :sessionToken()?requestSession(controller.signal):null;
      const pending=fresh?.then(value=>({value}),error=>({error}));
      const [pageModule,layout]=await Promise.all([route.load(),loadLayout(route.layout as Section)]);
      async function paint(snapshot:PageSnapshot|null,refreshing:boolean){
        if(cancelled||snapshot&&!currentPage(snapshot))return;
        if(snapshot)activatePage(snapshot);
        const view=await pageModule.default({...props,...(snapshot?{pageData:snapshot.payload.data}:{})});
        const content=await layout(view,runtime.user);
        if(cancelled||snapshot&&!currentPage(snapshot))return;
        setScreen({key:screenKey,content});setBusy(refreshing);
        const metadata="metadata" in pageModule?pageModule.metadata as {title?:unknown}:undefined;
        document.title=typeof metadata?.title==="string"?metadata.title+" · Track-and-Trace":"Track-and-Trace";
        if(lastPath.current!==window.location.pathname){
          lastPath.current=window.location.pathname;
          requestAnimationFrame(()=>window.location.hash?document.getElementById(window.location.hash.slice(1))?.scrollIntoView():window.scrollTo(0,0));
        }
      }
      if(cached)await paint(cached,true);
      if(!pending){await paint(null,false);return;}
      const result=await pending;
      if(cancelled)return;
      if("error"in result)throw result.error;
      if(!currentPage(result.value)){setBusy(false);return;}
      activatePage(result.value);
      if(cached?.body===result.value.body){setBusy(false);return;}
      await paint(result.value,false);
    }
    load().catch(e=>{
      if(cancelled)return;
      if(e instanceof NavigationSignal){
        if(e.missing){setScreen({key:screenKey,content:<NotFound/>});setBusy(false);}
        else navigate(e.destination,true);
      }else if(e instanceof DOMException&&e.name==="AbortError"){
        setBusy(false);
      }else {setError(e instanceof Error?e.message:"Unable to load this screen.");setBusy(false);}
    });
    return ()=>{cancelled=true;controller.abort();};
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
    const onVisible=()=>{if(document.visibilityState==="visible"&&sessionToken()){invalidatePageData();notifyNavigation();}};
    window.addEventListener("storage",onSessionStorage);
    document.addEventListener("visibilitychange",onVisible);
    return ()=>{
      document.removeEventListener("click",onClick,true);document.removeEventListener("submit",onSubmit);
      window.removeEventListener("storage",onSessionStorage);document.removeEventListener("visibilitychange",onVisible);
    };
  },[]);
  return <>
    {busy&&<div role="status" aria-label="Loading" className="fixed inset-x-0 top-0 z-[100] h-1 animate-pulse bg-amber"><span className="sr-only">Loading…</span></div>}
    {error&&<div role="alert" className="mx-auto my-6 max-w-2xl rounded-2xl border border-line bg-paper p-5"><p>{error}</p><button className="mt-2 font-semibold underline" onClick={()=>window.location.reload()}>Try again</button></div>}
    <div className="contents" key={screen?.key}>
      {screen?.content??<div className="mx-auto w-full max-w-6xl p-6"><Loading/></div>}
    </div>
  </>;
}
window.addEventListener("unhandledrejection",event=>console.error(event.reason));
createRoot(document.getElementById("root")!).render(<ScreenBoundary><App/></ScreenBoundary>);
if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});
