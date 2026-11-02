"use client";

import { useState } from "react";
import { Pencil, Save, ShieldCheck } from "lucide-react";
import type { Role } from "@/db/schema";
import { Card, CardHeader, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { updateUserAccessAction, updateUserProfileAction } from "../../actions";

type UserDetails = { id: string; name: string; firstName: string; lastName: string; email: string; idNumber: string; contactNo: string | null; collegeId: number | null; role: Role };
type Profile = {
  student: { course: string; yearLevel: number } | null;
  faculty: { department: string; academicRank: string } | null;
  staff: { office: string; position: string } | null;
  administrator: { office: string; adminLevel: string } | null;
};
type College = { id: number; name: string };

function RoleFields({ role, profile, prefix }: { role: Role; profile: Profile; prefix: string }) {
  if (role === "student") return <div className="grid gap-4 sm:grid-cols-2">
    <Field label="Course / program" htmlFor={`${prefix}-course`} required><Input id={`${prefix}-course`} name="course" required maxLength={150} defaultValue={profile.student?.course ?? ""} /></Field>
    <Field label="Year level" htmlFor={`${prefix}-year`} required><Select id={`${prefix}-year`} name="yearLevel" required defaultValue={profile.student?.yearLevel ?? ""}><option value="">Choose year…</option>{[1,2,3,4,5,6].map(y=><option key={y} value={y}>{y}</option>)}</Select></Field>
  </div>;
  if (role === "faculty") return <div className="grid gap-4 sm:grid-cols-2">
    <Field label="Department" htmlFor={`${prefix}-department`} required><Input id={`${prefix}-department`} name="department" required maxLength={150} defaultValue={profile.faculty?.department ?? ""} /></Field>
    <Field label="Academic rank" htmlFor={`${prefix}-rank`} required><Input id={`${prefix}-rank`} name="academicRank" required maxLength={80} defaultValue={profile.faculty?.academicRank ?? ""} /></Field>
  </div>;
  return <div className="grid gap-4 sm:grid-cols-2">
    <Field label="Office" htmlFor={`${prefix}-office`} required><Input id={`${prefix}-office`} name="office" required maxLength={150} defaultValue={role === "admin" ? profile.administrator?.office ?? "" : profile.staff?.office ?? ""} /></Field>
    {role === "staff" && <Field label="Position" htmlFor={`${prefix}-position`} required><Input id={`${prefix}-position`} name="position" required maxLength={100} defaultValue={profile.staff?.position ?? ""} /></Field>}
  </div>;
}

function CollegeField({ user, role, colleges, prefix }: { user: UserDetails; role: Role; colleges: College[]; prefix: string }) {
  return <Field label="College / office" htmlFor={`${prefix}-college`} required={role !== "admin"}>
    <Select id={`${prefix}-college`} name="collegeId" required={role !== "admin"} defaultValue={user.collegeId ?? ""}>
      <option value="">{role === "admin" ? "No college / central office" : "Choose college or office…"}</option>
      {colleges.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
    </Select>
  </Field>;
}

export function UserEditor({ user, profile, colleges, isSelf }: { user: UserDetails; profile: Profile; colleges: College[]; isSelf: boolean }) {
  const [role, setRole] = useState<Role>(user.role);
  return <div className="space-y-6">
    <Card><section id="profile" className="scroll-mt-24">
      <CardHeader icon={Pencil} title="Edit user information" description="Correct profile details while keeping reports, claims, and history." />
      <form action={updateUserProfileAction.bind(null, user.id)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="edit-first" required><Input id="edit-first" name="firstName" required maxLength={100} defaultValue={user.firstName} /></Field>
          <Field label="Last name" htmlFor="edit-last" required><Input id="edit-last" name="lastName" required maxLength={100} defaultValue={user.lastName} /></Field>
          <Field label="Display name" htmlFor="edit-display" required><Input id="edit-display" name="displayName" required maxLength={255} defaultValue={user.name} /></Field>
          <Field label="University ID number" htmlFor="edit-id" required><Input id="edit-id" name="idNumber" required minLength={3} maxLength={50} defaultValue={user.idNumber} /></Field>
          <Field label="Email" htmlFor="edit-email" required hint={isSelf ? "Another administrator must change your sign-in email." : "Changing this signs the user out and requires email verification."}><Input id="edit-email" name="email" type="email" required readOnly={isSelf} maxLength={255} defaultValue={user.email} /></Field>
          <Field label="Contact number" htmlFor="edit-contact"><Input id="edit-contact" name="contactNo" type="tel" maxLength={30} defaultValue={user.contactNo ?? ""} /></Field>
        </div>
        <CollegeField user={user} role={user.role} colleges={colleges} prefix="profile" />
        <RoleFields role={user.role} profile={profile} prefix="profile" />
        <SubmitButton><Save aria-hidden />Save user information</SubmitButton>
      </form>
    </section></Card>
    <Card><section id="access" className="scroll-mt-24">
      <CardHeader icon={ShieldCheck} title="Manage access" description="Choose the user's role. Changes sign them out so the new permissions apply on their next login." />
      {isSelf ? <p className="rounded-xl bg-sand p-4 text-sm text-ink-soft">You can edit your profile above. Another administrator must change your role or deactivate your account.</p> :
        <form action={updateUserAccessAction.bind(null, user.id)} className="space-y-4">
          <Field label="Access role" htmlFor="access-role" required><Select id="access-role" name="role" value={role} onChange={e=>setRole(e.target.value as Role)}><option value="student">Student</option><option value="faculty">Faculty member</option><option value="staff">Staff member</option><option value="admin">Administrator</option></Select></Field>
          <p className="text-sm text-ink-muted">{role === "admin" ? "Administrators can review claims, verify reports, manage accounts, and export records." : "Campus users can manage their own reports and claims, search verified items, and view their updates."}</p>
          <CollegeField key={`college-${role}`} user={user} role={role} colleges={colleges} prefix="access" />
          <RoleFields key={role} role={role} profile={profile} prefix="access" />
          <p className="text-xs text-ink-muted">Changing the role keeps the account&apos;s current active or deactivated status.</p>
          <SubmitButton><ShieldCheck aria-hidden />Save access</SubmitButton>
        </form>}
    </section></Card>
  </div>;
}
