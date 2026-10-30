"use client";

import { useActionState } from "react";
import { Briefcase, Building2, GraduationCap, Layers, Phone, School, UserRound } from "lucide-react";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input, Select } from "@/components/ui";
import { useActionForm } from "@/components/use-action-form";
import { changePasswordAction, deactivateAccountAction, updateProfileAction, type ProfileState } from "./actions";

export function ProfileForm({
  role,
  colleges,
  defaults,
}: {
  role: string;
  colleges: { id: number; name: string }[];
  defaults: Record<string, string>;
}) {
  const { state, pending, onSubmit } = useActionForm<ProfileState>(updateProfileAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {state.message && <Alert tone="green">{state.message}</Alert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="firstName" error={e.firstName}>
          <Input id="firstName" name="firstName" icon={UserRound} defaultValue={defaults.firstName} />
        </Field>
        <Field label="Last name" htmlFor="lastName" error={e.lastName}>
          <Input id="lastName" name="lastName" icon={UserRound} defaultValue={defaults.lastName} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact number" htmlFor="contactNo" error={e.contactNo}>
          <Input id="contactNo" name="contactNo" icon={Phone} placeholder="e.g. 0917 123 4567" defaultValue={defaults.contactNo} />
        </Field>
        <Field label="College or office" htmlFor="collegeId" error={e.collegeId}>
          <Select id="collegeId" name="collegeId" icon={Building2} defaultValue={defaults.collegeId}>
            <option value="">Choose…</option>
            {colleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      {role === "student" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Course / program" htmlFor="course" className="sm:col-span-2">
            <Input id="course" name="course" icon={GraduationCap} defaultValue={defaults.course} />
          </Field>
          <Field label="Year level" htmlFor="yearLevel">
            <Select id="yearLevel" name="yearLevel" icon={Layers} defaultValue={defaults.yearLevel}>
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}
      {role === "faculty" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Department" htmlFor="department">
            <Input id="department" name="department" icon={School} defaultValue={defaults.department} />
          </Field>
          <Field label="Academic rank" htmlFor="academicRank">
            <Input id="academicRank" name="academicRank" icon={GraduationCap} defaultValue={defaults.academicRank} />
          </Field>
        </div>
      )}
      {role === "staff" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Office" htmlFor="office">
            <Input id="office" name="office" icon={Building2} defaultValue={defaults.office} />
          </Field>
          <Field label="Position" htmlFor="position">
            <Input id="position" name="position" icon={Briefcase} defaultValue={defaults.position} />
          </Field>
        </div>
      )}
      <div className="flex justify-end">
        <SubmitButton pending={pending}>Save profile</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<ProfileState, FormData>(changePasswordAction, {});
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      {state.message && <Alert tone="green">{state.message}</Alert>}
      <Field label="Current password" htmlFor="currentPassword" error={e.currentPassword}>
        <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" placeholder="Your current password" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="newPassword" error={e.newPassword}>
          <PasswordInput id="newPassword" name="newPassword" autoComplete="new-password" placeholder="At least 8 characters" />
        </Field>
        <Field label="Confirm new password" htmlFor="confirmPassword" error={e.confirmPassword}>
          <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" placeholder="Type it again" />
        </Field>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingText="Changing…">Change password</SubmitButton>
      </div>
    </form>
  );
}

export function DeactivateForm() {
  const [state, action] = useActionState<ProfileState, FormData>(deactivateAccountAction, {});
  return (
    <form action={action} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
      <Field label='Type "DEACTIVATE" to confirm' htmlFor="confirm" error={state.error} className="flex-1">
        <Input id="confirm" name="confirm" autoComplete="off" placeholder="DEACTIVATE" />
      </Field>
      <SubmitButton variant="danger" pendingText="…">
        Deactivate my account
      </SubmitButton>
    </form>
  );
}
