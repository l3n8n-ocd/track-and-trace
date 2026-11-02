import { describe, expect, it } from "vitest";
import nodemailer from "nodemailer";
import { buildEmailMessage } from "@/lib/email-message";

const input = { to: "recipient@example.test", subject: "Verify your email address", title: "Verify your email address",
  paragraphs: ["Hi María,", "Confirm your account. This link expires in one hour."],
  action: { label: "Verify email", url: "/verify-email?token=signed-token&source=email" } };
const baseUrl = "https://track-and-trace-bulsu-2026.web.app";
const sender = "sender@gmail.com";
describe("transactional email composition", () => {
  it("keeps the authenticated sender and reply address aligned without impersonating the hosting domain", () => {
    const result = buildEmailMessage(input, sender, baseUrl);
    expect(result.from.address).toBe(sender);
    expect(result.replyTo.address).toBe(sender);
    expect(result.to.address).toBe(input.to);
    expect(result.headers["Auto-Submitted"]).toBe("auto-generated");
  });
  it("preserves signed verification links in matching HTML and text alternatives", () => {
    const result = buildEmailMessage(input, sender, baseUrl);
    const link = baseUrl + input.action.url;
    expect(result.text).toContain(`Verify email: ${link}`);
    expect(result.html).toContain(`href="${link.replace(/&/g, "&amp;")}"`);
    for (const paragraph of input.paragraphs) {
      expect(result.text).toContain(paragraph);
      expect(result.html).toContain(paragraph);
    }
    expect(result.text).toContain("This is an automated message");
    expect(result.html).toContain("This is an automated message");
    expect(result.html).not.toMatch(/<img|<script|<iframe/i);
  });
  it("escapes user-controlled names and link attributes", () => {
    const result = buildEmailMessage({ ...input, title: '<img src=x onerror="alert(1)">', paragraphs: ["<script>alert('name')</script>"] }, sender, baseUrl);
    expect(result.html).not.toContain("<script>");
    expect(result.html).toContain("&lt;script&gt;");
    expect(result.html).toContain("&quot;alert(1)&quot;");
  });
  it("supports notifications with no button and rejects executable action URLs", () => {
    expect(buildEmailMessage({ ...input, action: undefined }, sender, baseUrl).text).not.toContain("signed-token");
    expect(() => buildEmailMessage({ ...input, action: { label: "Click", url: "javascript:alert(1)" } }, sender, baseUrl)).toThrow("HTTP or HTTPS");
  });
  it("builds a complete multipart MIME message without contacting a mail server", async () => {
    const transport = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "windows" });
    const result = await transport.sendMail(buildEmailMessage(input, sender, baseUrl));
    const mime = result.message.toString();
    expect(mime).toContain('From: "Track-and-Trace" <sender@gmail.com>');
    expect(mime).toMatch(/Auto-Submitted: auto-generated/);
    expect(mime).toMatch(/Message-ID: <[^>]+>/);
    expect(mime).toContain("multipart/alternative");
    expect(mime).toContain("text/plain; charset=utf-8");
    expect(mime).toContain("text/html; charset=utf-8");
    expect(result.envelope).toEqual({ from: sender, to: [input.to] });
  });
});
