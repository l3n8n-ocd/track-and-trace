# Verification email delivery

Track-and-Trace uses the existing free Gmail SMTP account. The visible sender and reply address must remain that authenticated Gmail mailbox. Do not substitute a `web.app`, `vercel.app`, or university address that the sender does not own.

## Application behavior

- Verification links keep their signed token, trusted callback origin, one-hour lifetime, and required email verification.
- Signup, sign-in, and explicit resend share a database-backed, per-recipient one-minute cooldown. Repeated clicks do not produce a burst of duplicate emails, including across serverless instances. The original email remains usable during the cooldown.
- Messages include matching plain-text and HTML versions, an explicit account-verification purpose, expiry and unsolicited-request guidance, and a visible fallback link. There are no external images, tracking pixels, or shortened links.
- Automated messages identify themselves with the standard `Auto-Submitted` header. This prevents misleading manual-email behavior; it is not a spam-filter bypass.

The existing `rate_limit` table stores cooldown keys as hashes of normalized email addresses. No database migration or paid service is required.
If the cooldown store is temporarily unavailable, a warning is logged and normal email delivery continues. Required email verification is never disabled.

## What was verified

An existing password-reset email from the same application sender dated 31 October 2026 was inspected in Gmail's **Show original** report. SPF, DKIM, and DMARC all passed, and the sample was in the inbox. This is evidence for that specific message, not proof that every verification message will reach every inbox.

Automated tests compose MIME mail locally without delivering it to real recipients. They check sender/envelope alignment, equivalent HTML and text content, preservation of signed URLs, and cooldown behavior. Inbox placement still needs a recipient-controlled verification request after deployment.

## If a recipient still sees Spam

1. Confirm the message is the expected Track-and-Trace email, then select **Not spam** and add the sending Gmail address to contacts if desired. Avoid repeatedly requesting new messages.
2. Inspect **Show original** / message headers on the affected email. Check SPF, DKIM, DMARC, the actual sender, and any provider warning. A passing sample in another mailbox cannot establish the reason for this classification.
3. A personal `@gmail.com` sender cannot publish SPF, DKIM, or DMARC records for `gmail.com`; Google manages that authentication. Firebase Hosting is not the outbound mail provider.
4. For a future sender-domain migration, use a domain the group owns and the provider's domain-verification process. Publish only the exact SPF/DKIM/DMARC records supplied for that domain. Domain ownership and a free transactional service account must be available before making that change; a free sending tier does not include domain ownership or guarantee inbox placement.

References: [Google sender guidelines](https://support.google.com/mail/answer/81126?hl=en), [Nodemailer Gmail guidance](https://nodemailer.com/guides/using-gmail), [Nodemailer message configuration](https://nodemailer.com/message).
