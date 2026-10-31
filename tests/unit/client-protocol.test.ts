import { describe, expect, it, vi } from "vitest";
vi.mock("server-only",()=>({}));
import { clientData, decodeAction, redirectFromError } from "@/server/client-protocol";
const owner={id:"owner",name:"Owner",email:"owner@example.test",role:"student",firstName:"Owner",lastName:"Tester"} as const;
describe("separate frontend API boundary",()=>{
  it("redacts other finders' hidden details and descriptions",()=>{
    const data=clientData({reportType:"FOUND",userId:"finder",itemName:"Wallet",hiddenDetails:"secret mark",description:"private description"},owner);
    expect(data).toEqual({reportType:"FOUND",userId:"finder",itemName:"Wallet"});
  });
  it("preserves the owner's own report details",()=>{
    expect(clientData({reportType:"LOST",userId:"owner",hiddenDetails:"my mark"},owner)).toHaveProperty("hiddenDetails","my mark");
  });
  it("allows administrators to inspect hidden report details",()=>{
    expect(clientData({reportType:"FOUND",userId:"finder",hiddenDetails:"mark"},{...owner,role:"admin"})).toHaveProperty("hiddenDetails","mark");
  });
  it("does not expose private proof storage paths",()=>{
    expect(clientData({id:4,filePath:"cldauth:raw:private-proof"},owner)).toEqual({id:4,filePath:"protected"});
  });
  it("serializes maps, sets and dates without losing their types",()=>{
    expect(clientData({map:new Map([[4,{value:1}]]),set:new Set([4]),date:new Date("2026-10-31T00:00:00Z")},owner)).toEqual({
      map:{$type:"Map",entries:[[4,{value:1}]]},set:{$type:"Set",values:[4]},date:{$type:"Date",value:"2026-10-31T00:00:00.000Z"},
    });
  });
  it("preserves repeated form entries and bound action arguments",()=>{
    const form=new FormData();
    form.set("$action","(app)/reports/actions:updateReportAction");
    form.set("$args",JSON.stringify([42,{},{$form:true}]));
    form.append("$form2:removeImage","2");form.append("$form2:removeImage","3");
    const decoded=decodeAction(form);
    expect(decoded.args[0]).toBe(42);
    expect((decoded.args[2] as FormData).getAll("removeImage")).toEqual(["2","3"]);
  });
  it("preserves redirects with semicolons",()=>{
    expect(redirectFromError({digest:"NEXT_REDIRECT;replace;/reports?q=a;b;303;"})).toBe("/reports?q=a;b");
  });
});
