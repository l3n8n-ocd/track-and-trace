import type { Metadata } from "next";

export const metadata: Metadata = { title: "Data privacy notice" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-sm leading-6 text-slate-700">
      <h1 className="text-2xl font-semibold text-slate-900">Data privacy notice</h1>
      <p>
        ReturnDesk is the lost and found management system of Bulacan State University – Main Campus.
        This notice explains what personal information it collects and how it is used, in line with the
        Data Privacy Act of 2012 (Republic Act No. 10173).
      </p>
      <h2 className="text-base font-semibold text-slate-900">What we collect</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Account details: name, university ID number, email, contact number, college or office, and role-specific details (course and year level, department and rank, or office and position).</li>
        <li>Reports you file: item descriptions, photos, dates, and places.</li>
        <li>Claims you file: your ownership statement and proof files such as photos or receipts.</li>
        <li>A log of actions taken in the system, for accountability.</li>
      </ul>
      <h2 className="text-base font-semibold text-slate-900">Why we collect it</h2>
      <p>
        Only to match lost and found items, verify ownership before an item is released, contact you
        about your reports and claims, and keep an accurate record of items handled by the Lost and
        Found Office.
      </p>
      <h2 className="text-base font-semibold text-slate-900">Who can see it</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Other users see only limited details of found items (name, category, date, building, and a blurred photo). They never see your personal details.</li>
        <li>Proof of ownership and hidden item details are visible only to you and to authorized lost and found administrators.</li>
        <li>Administrators see account details to verify claims and manage records.</li>
      </ul>
      <h2 className="text-base font-semibold text-slate-900">How long we keep it</h2>
      <p>
        Reports and claims are kept while they are active and for record keeping afterward, according
        to university policy. You can download a copy of your data or deactivate your account from your
        profile page.
      </p>
      <h2 className="text-base font-semibold text-slate-900">Your rights</h2>
      <p>
        You may access, correct, or request deletion of your personal data, and object to its
        processing, as provided by RA 10173. Contact the Lost and Found Office for any privacy concern.
      </p>
    </article>
  );
}
