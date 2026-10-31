import { createContext, useContext, type AnchorHTMLAttributes, type Ref } from "react";
import { navigate } from "./navigation";
import { prefetchRoute } from "./routes";
type Props=Omit<AnchorHTMLAttributes<HTMLAnchorElement>,"href">&{href:string|{pathname?:string;query?:Record<string,string>};prefetch?:boolean;replace?:boolean;scroll?:boolean;ref?:Ref<HTMLAnchorElement>};
const Pending=createContext({pending:false});
export function useLinkStatus(){return useContext(Pending);}
export default function Link({href,prefetch=true,replace=false,scroll:_scroll,onClick,onPointerEnter,onFocus,onTouchStart,children,...props}:Props){
  void _scroll;
  const value=typeof href==="string"?href:(href.pathname??"")+((href.query)?"?"+new URLSearchParams(href.query):"");
  const warm=()=>{if(prefetch&&!props.target&&!props.download)prefetchRoute(value);};
  return <a {...props} href={value}
    onPointerEnter={event=>{onPointerEnter?.(event);if(!event.defaultPrevented)warm();}}
    onFocus={event=>{onFocus?.(event);if(!event.defaultPrevented)warm();}}
    onTouchStart={event=>{onTouchStart?.(event);if(!event.defaultPrevented)warm();}}
    onClick={event=>{
    onClick?.(event);
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||props.target||props.download)return;
    if(!value.startsWith("/")||value.startsWith("//")||value.startsWith("/api/"))return;
    const url=new URL(value,window.location.origin);
    if(url.pathname===window.location.pathname&&url.search===window.location.search&&url.hash)return;
    event.preventDefault();navigate(value,replace);
  }}><Pending.Provider value={{pending:false}}>{children}</Pending.Provider></a>;
}
