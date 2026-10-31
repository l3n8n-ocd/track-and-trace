import { createContext, useContext, type AnchorHTMLAttributes, type Ref } from "react";
import { navigate, useLocation } from "./navigation";
type Props=Omit<AnchorHTMLAttributes<HTMLAnchorElement>,"href">&{href:string|{pathname?:string;query?:Record<string,string>};prefetch?:boolean;replace?:boolean;scroll?:boolean;ref?:Ref<HTMLAnchorElement>};
const Pending=createContext({pending:false});
export function useLinkStatus(){return useContext(Pending);}
export default function Link({href,prefetch:_prefetch,replace=false,scroll:_scroll,onClick,children,...props}:Props){
  void _prefetch; void _scroll;
  useLocation();
  const value=typeof href==="string"?href:(href.pathname??"")+((href.query)?"?"+new URLSearchParams(href.query):"");
  return <a {...props} href={value} onClick={event=>{
    onClick?.(event);
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||props.target||props.download)return;
    if(!value.startsWith("/")||value.startsWith("//")||value.startsWith("/api/"))return;
    const url=new URL(value,window.location.origin);
    if(url.pathname===window.location.pathname&&url.search===window.location.search&&url.hash)return;
    event.preventDefault();navigate(value,replace);
  }}><Pending.Provider value={{pending:false}}>{children}</Pending.Provider></a>;
}
