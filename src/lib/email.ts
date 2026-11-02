import "server-only";
import nodemailer from "nodemailer";
import { appUrl, env, smtpEnabled } from "./env";
import { buildEmailMessage, type EmailMessage } from "./email-message";
export type { EmailMessage } from "./email-message";

const transporter = smtpEnabled
  ? nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    })
  : null;

// Sends an email, or prints it to the console when SMTP isn't configured.
// Failures are logged rather than thrown so a mail problem never breaks
// the action that triggered it.
export async function sendEmail(message: EmailMessage) {
  const composed = buildEmailMessage(message, env.SMTP_USER || "development@example.test", appUrl());
  if (!transporter) {
    if (env.NODE_ENV === "production") console.warn("[email] SMTP_USER or SMTP_PASSWORD is not set; email not sent");
    console.info(`[email] to=${message.to} subject="${message.subject}"\n${composed.text}`);
    return;
  }
  try {
    await transporter.sendMail(composed);
  } catch (error) {
    console.error(`[email] failed to send "${message.subject}" to ${message.to}:`, error);
  }
}
