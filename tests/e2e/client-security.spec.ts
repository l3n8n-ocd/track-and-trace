import {expect,test} from "@playwright/test";
import {ADMIN,login,closeDb,db,register,run} from "./helpers";
import type {ResultSetHeader} from "mysql2";
const api=process.env.E2E_API_BASE_URL;
test.describe("static frontend API security",()=>{
  test.skip(!api,"Only runs for the separate static frontend/API configuration.");
  test("allows only the configured frontend origin",async({request})=>{
    const good=await request.fetch(api+"/api/client/page",{method:"OPTIONS",headers:{Origin:"http://localhost:5173","Access-Control-Request-Method":"POST","Access-Control-Request-Headers":"authorization"}});
    expect(good.status()).toBe(204);
    expect(good.headers()["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(good.headers()["access-control-max-age"]).toBe("600");
    const bad=await request.fetch(api+"/api/client/page",{method:"OPTIONS",headers:{Origin:"https://untrusted.example"}});
    expect(bad.status()).toBe(403);
    expect(bad.headers()["access-control-allow-origin"]).toBeUndefined();
  });
  test("rejects unsigned or invalid tokens and anonymous private-page requests",async({request})=>{
    const path=api+"/api/client/page?id=admin&params=%7B%7D&search=%7B%7D";
    expect((await request.get(path)).status()).toBe(401);
    expect((await request.get(path,{headers:{Authorization:"Bearer unsigned-token"}})).status()).toBe(401);
    expect((await request.get(path,{headers:{Authorization:"Bearer invalid.signature"}})).status()).toBe(401);
  });
  test("does not expose hidden finder details in matching JSON",async({page})=>{
    const email=`privacy.${run}@trackandtrace.test`;
    await register(page,{first:"Privacy",email,idNumber:`PRIV-${run}`});
    const [rows]=await db().query("select id from user where email=?",[email]);
    const owner=(rows as {id:string}[])[0];
    const [references]=await db().query("select (select category_id from category limit 1) categoryId,(select location_id from location limit 1) locationId,(select id from user where role='admin' limit 1) adminId");
    const ref=(references as {categoryId:number;locationId:number;adminId:string}[])[0];
    const reportIds:number[]=[];
    for(const [user,type] of [[owner.id,"LOST"],[ref.adminId,"FOUND"]]){
      const [insert]=await db().query<ResultSetHeader>("insert into report(user_id,category_id,location_id,report_type,item_name,date_lost_or_found,status,description,hidden_details) values(?,?,?,?,?,curdate(),'VERIFIED',?,?)",[user,ref.categoryId,ref.locationId,type,"Privacy fixture", "Private ownership description", "Private serial number"]);
      reportIds.push(insert.insertId);
    }
    await db().query("insert into match_record(lost_report_id,found_report_id,match_score) values(?,?,90)",reportIds);
    await login(page,email);
    const token=await page.evaluate(()=>localStorage.getItem("track-and-trace-session"));
    const response=await page.request.get(api+"/api/client/page?id=%28app%29%2Fmatches&params=%7B%7D&search=%7B%7D",{headers:{Authorization:"Bearer "+token}});
    expect(response.status()).toBe(200);
    const body=await response.json();
    expect(response.headers()["server-timing"]).toMatch(/auth;dur=.*page;dur=.*nav;dur=.*total;dur=/);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(body.data.rows.length).toBeGreaterThan(0);
    for(const row of body.data.rows){
      expect(row.found).not.toHaveProperty("hiddenDetails");
      expect(row.found).not.toHaveProperty("description");
    }
    const adminPage=await page.request.get(api+"/api/client/page?id=admin&params=%7B%7D&search=%7B%7D",{headers:{Authorization:"Bearer "+token}});
    expect(adminPage.status()).toBe(403);
    await db().query("delete from match_record where lost_report_id=?",[reportIds[0]]);
    await db().query("delete from report where report_id in (?,?)",reportIds);
  });
  test("an administrator can download CSV through the authenticated API",async({page})=>{
    await login(page,ADMIN.email,ADMIN.password);
    const token=await page.evaluate(()=>localStorage.getItem("track-and-trace-session"));
    const response=await page.request.get(api+"/api/client/download/admin?type=reports",{headers:{Authorization:"Bearer "+token,Origin:"http://localhost:5173"}});
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["content-disposition"]).toContain("attachment");
  });
});
test.afterAll(closeDb);
