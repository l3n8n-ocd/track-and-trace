import {expect,test} from "@playwright/test";
import {ADMIN,login} from "./helpers";
test("static frontend renders administrator overview without client errors",async({page})=>{
  test.skip(!process.env.E2E_API_BASE_URL,"Checks the separate static frontend.");
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  await login(page,ADMIN.email,ADMIN.password);
  await expect(page.getByRole("heading",{name:"Claims to review",exact:true})).toBeVisible();
  for(const path of ["/admin/reports","/admin/claims","/admin/records","/admin/users","/admin/users/new","/admin/settings","/admin/announcements","/search","/profile","/notifications"]){
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByRole("heading",{name:"Unable to show this screen"})).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});
