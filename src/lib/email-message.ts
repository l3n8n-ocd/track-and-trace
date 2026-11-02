export type EmailMessage = {
  to: string;
  subject: string;
  title: string;
  paragraphs: string[];
  action?: { label: string; url: string };
};

const footer = "Track-and-Trace | Bulacan State University – Main Campus";
const automated = "This is an automated message from the Track-and-Trace lost-and-found system.";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Keep HTML and plain text equivalent, with no tracking, URL shorteners,
// external images, or unrelated links. Authentication is supplied by Gmail.
export function buildEmailMessage(message: EmailMessage, sender: string, baseUrl: string) {
  const action = message.action && { ...message.action, url: new URL(message.action.url, baseUrl).toString() };
  if (action && !["https:", "http:"].includes(new URL(action.url).protocol)) throw new Error("Email action requires an HTTP or HTTPS link.");
  const text = ["Track-and-Trace", "", message.title, "", ...message.paragraphs,
    action ? `\n${action.label}: ${action.url}` : "", "", footer, automated].join("\n");
  const body = message.paragraphs.map(p => `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(p)}</p>`).join("");
  const button = action ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:#670001;color:#ffffff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold">${escapeHtml(action.label)}</a></p>
    <p style="margin:0 0 16px;font-size:13px;line-height:1.5">If the button does not work, open this same link:<br><a href="${escapeHtml(action.url)}" style="color:#670001;word-break:break-all">${escapeHtml(action.url)}</a></p>` : "";
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(message.title)}</title></head>
    <body style="margin:0;background:#ffffff;color:#242020;font-family:Arial,sans-serif;font-size:15px"><div style="max-width:560px;margin:0 auto;padding:24px">
    <p style="margin:0 0 24px;color:#670001;font-size:18px;font-weight:bold">Track-and-Trace</p><h1 style="font-size:22px;line-height:1.3;margin:0 0 20px">${escapeHtml(message.title)}</h1>
    ${body}${button}<hr style="border:0;border-top:1px solid #dedbd5;margin:24px 0"><p style="font-size:12px;color:#655d5d;line-height:1.5">${escapeHtml(footer)}<br>${automated}</p></div></body></html>`;
  return {
    // Never impersonate a university address or the web.app hosting domain.
    from: { name: "Track-and-Trace", address: sender },
    to: { address: message.to, name: "" },
    replyTo: { name: "Track-and-Trace", address: sender },
    subject: `Track-and-Trace: ${message.subject}`,
    text, html,
    headers: { "Auto-Submitted": "auto-generated" },
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}
