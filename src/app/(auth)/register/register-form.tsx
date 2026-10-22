"use client";

import Link from "next/link";
import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input, Select } from "@/components/ui";
import { useActionForm } from "@/components/use-action-form";
import { registerAction, type FormState } from "../actions";

type College = { id: number; name: string };

export function RegisterForm({ colleges }: { colleges: College[] }) {
  const { state, pending, onSubmit } = useActionForm<FormState>(registerAction, {});
  const [role, setRole] = useState(state.values?.role ?? "student");
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
      {state.error && <Alert>{state.error}</Alert>}

      <Field label="I am a" htmlFor="role" error={e.role} required>
        <Select id="role" name="role" value={role} onChange={(ev) => setRole(ev.target.value)}>
          <option value="student">Student</option>
          <option value="faculty">Faculty member</option>
          <option value="staff">Staff member</option>
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" htmlFor="firstName" error={e.firstName} required>
          <Input id="firstName" name="firstName" autoComplete="given-name" defaultValue={v.firstName} />
        </Field>
        <Field label="Last name" htmlFor="lastName" error={e.lastName} required>
          <Input id="lastName" name="lastName" autoComplete="family-name" defaultValue={v.lastName} />
        </Field>
      </div>

      <Field label="University ID number" htmlFor="idNumber" error={e.idNumber} required>
        <Input id="idNumber" name="idNumber" defaultValue={v.idNumber} placeholder="e.g. 2023012345" />
      </Field>

      <Field label="College or office" htmlFor="collegeId" error={e.collegeId} required>
        <Select id="collegeId" name="collegeId" defaultValue={v.collegeId ?? ""}>
          <option value="" disabled>
            Choose…
          </option>
          {colleges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      {role === "student" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Course / program" htmlFor="course" error={e.course} required className="sm:col-span-2">
            <Input id="course" name="course" defaultValue={v.course} placeholder="e.g. BSIT" />
          </Field>
          <Field label="Year level" htmlFor="yearLevel" error={e.yearLevel} required>
            <Select id="yearLevel" name="yearLevel" defaultValue={v.yearLevel ?? ""}>
              <option value="" disabled>
                Choose…
              </option>
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
          <Field label="Department" htmlFor="department" error={e.department} required>
            <Input id="department" name="department" defaultValue={v.department} />
          </Field>
          <Field label="Academic rank" htmlFor="academicRank" error={e.academicRank} required>
            <Input id="academicRank" name="academicRank" defaultValue={v.academicRank} placeholder="e.g. Instructor I" />
          </Field>
        </div>
      )}
      {role === "staff" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Office" htmlFor="office" error={e.office} required>
            <Input id="office" name="office" defaultValue={v.office} />
          </Field>
          <Field label="Position" htmlFor="position" error={e.position} required>
            <Input id="position" name="position" defaultValue={v.position} />
          </Field>
        </div>
      )}

      <Field label="Email" htmlFor="email" error={e.email} required hint="We'll send a verification link here.">
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={v.email} />
      </Field>
      <Field label="Contact number" htmlFor="contactNo" error={e.contactNo} hint="Optional">
        <Input id="contactNo" name="contactNo" type="tel" autoComplete="tel" defaultValue={v.contactNo} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Password" htmlFor="password" error={e.password} required hint="At least 8 characters">
          <Input id="password" name="password" type="password" autoComplete="new-password" />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword" error={e.confirmPassword} required>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" />
        </Field>
      </div>

      <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
        <p className="font-medium text-slate-800">Data privacy notice</p>
        <p className="mt-1">
          ReturnDesk collects your name, ID number, college, contact details, and the reports and
          claims you submit, only to help recover lost items on campus. Lost and found administrators
          can see this information. It is handled under the Data Privacy Act of 2012 (RA 10173). See
          the{" "}
          <Link href="/privacy" className="text-brand-700 underline" target="_blank">
            privacy notice
          </Link>
          .
        </p>
        <label className="mt-2 flex items-start gap-2 text-slate-800">
          <input type="checkbox" name="consent" className="mt-0.5" defaultChecked={v.consent === "on"} />
          <span>I have read and agree to the data privacy notice.</span>
        </label>
        {e.consent && <p className="mt-1 text-brand-700">{e.consent}</p>}
      </div>

      <SubmitButton pending={pending} className="w-full" pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
