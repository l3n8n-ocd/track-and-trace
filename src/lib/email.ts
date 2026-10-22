import "server-only";
import nodemailer from "nodemailer";
import { appUrl, env, smtpEnabled } from "./env";

const transporter = smtpEnabled
  ? nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  : null;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(title: string, paragraphs: string[], action?: { label: string; url: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 12px">${escapeHtml(p)}</p>`).join("");
  const button = action
    ? `<p style="margin:20px 0"><a href="${escapeHtml(action.url)}" style="background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block">${escapeHtml(action.label)}</a></p>
       <p style="margin:0 0 12px;font-size:12px;color:#6b7280">If the button doesn't work, copy this link: ${escapeHtml(action.url)}</p>`
    : "";
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111827">
    <h2 style="color:#1d4ed8;margin:0 0 16px">ReturnDesk</h2>
    <h3 style="margin:0 0 12px">${escapeHtml(title)}</h3>
    ${body}${button}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
    <p style="font-size:12px;color:#6b7280">Bulacan State University – Main Campus Lost and Found. This is an automated message.</p>
  </div>`;
}

export type EmailMessage = {
  to: string;
  subject: string;
  title: string;
  paragraphs: string[];
  action?: { label: string; url: string };
};

// Sends an email, or prints it to the console when SMTP isn't configured.
// Failures are logged rather than thrown so a mail problem never breaks
// the action that triggered it.
export async function sendEmail(message: EmailMessage) {
  const action = message.action && {
    ...message.action,
    url: message.action.url.startsWith("http") ? message.action.url : `${appUrl()}${message.action.url}`,
  };
  const text = [message.title, "", ...message.paragraphs, action ? `\n${action.label}: ${action.url}` : ""].join("\n");
  if (!transporter) {
    console.info(`[email] to=${message.to} subject="${message.subject}"\n${text}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: `ReturnDesk <${env.SMTP_USER}>`,
      to: message.to,
      subject: `ReturnDesk: ${message.subject}`,
      text,
      html: layout(message.title, message.paragraphs, action),
    });
  } catch (error) {
    console.error("[email] failed to send", message.subject, error);
  }
}
