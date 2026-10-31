import {expect,test} from "@playwright/test";
import {readFileSync} from "node:fs";
import {register,login,logout,closeDb,run} from "./helpers";

test("static frontend verifies email and resets a password using the emailed links",async({page})=>{
  test.skip(!process.env.E2E_API_BASE_URL||!process.env.E2E_EMAIL_LOG,"Requires the local server email log and static frontend.");
  const email=`email.${run}@trackandtrace.test`;
  async function emailedLink(label:string){
    let link="";
    await expect.poll(()=>{
      const log=readFileSync(process.env.E2E_EMAIL_LOG!,"utf8");
      const message=log.slice(log.lastIndexOf(`[email] to=${email}`));
      link=message.split(/\r?\n/).find(line=>line.startsWith(label+": "))?.slice(label.length+2)||"";
      return Boolean(link);
    }).toBe(true);
    return link;
  }
  await register(page,{first:"Email",email,idNumber:`MAIL-${run}`},false);
  const verification=await emailedLink("Verify email");
  expect(new URL(verification).origin).toBe(process.env.E2E_BASE_URL);
  await page.goto(verification);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading",{name:/Good /})).toBeVisible();
  expect(await page.evaluate(()=>Boolean(localStorage.getItem("track-and-trace-session")))).toBe(true);
  await logout(page);
  await page.goto("/forgot-password");
  await page.fill("#email",email);
  await page.click("button[type=submit]");
  await expect(page.getByText(/If that email is registered/)).toBeVisible();
  await page.goto(await emailedLink("Reset password"));
  await expect(page).toHaveURL(/\/reset-password\?token=/);
  expect(new URL(page.url()).origin).toBe(process.env.E2E_BASE_URL);
  await page.fill("#password","ResetPassword123");
  await page.fill("#confirmPassword","ResetPassword123");
  await page.click("button[type=submit]");
  await expect(page).toHaveURL(/\/login/);
  await login(page,email,"ResetPassword123");
  await expect(page).toHaveURL(/\/dashboard/);
});
test.afterAll(closeDb);
