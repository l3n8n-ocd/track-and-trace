"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Briefcase,
  Building2,
  GraduationCap,
  IdCard,
  KeyRound,
  Layers,
  Mail,
  Phone,
  School,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { FormSection, StepTracker, type StepDef } from "@/components/form-steps";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Field, Input, Select } from "@/components/ui";
import { useActionForm } from "@/components/use-action-form";
import { registerAction, type FormState } from "../actions";

type College = { id: number; name: string };

const ROLE_FIELDS: Record<string, string[]> = {
  student: ["course", "yearLevel"],
  faculty: ["department", "academicRank"],
  staff: ["office", "position"],
};

export function RegisterForm({ colleges }: { colleges: College[] }) {
  const { state, pending, onSubmit } = useActionForm<FormState>(registerAction, {});
  const [role, setRole] = useState(state.values?.role ?? "student");
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  const bad = (k: string) => Boolean(e[k]);

  const steps = useMemo<StepDef[]>(
    () => [
      { id: "step-you", label: "About you", required: ["role", "firstName", "lastName", "idNumber"] },
      { id: "step-campus", label: "University", required: ["collegeId", ...ROLE_FIELDS[role]] },
      { id: "step-account", label: "Sign-in", required: ["email", "password", "confirmPassword"], fields: ["contactNo"] },
      { id: "step-consent", label: "Privacy", required: ["consent"] },
    ],
    [role],
  );

  return (
    <form id="register-form" onSubmit={onSubmit} className="space-y-4" noValidate>
      <StepTracker formId="register-form" steps={steps} errors={e} className="sticky top-3 z-10" />

      {state.error && <Alert>{state.error}</Alert>}
      {Object.keys(e).length > 0 && <Alert>Some details are missing or need fixing. Look for the steps marked in red.</Alert>}

      <FormSection id="step-you" step={1} title="About you" description="Tell us who you are on campus.">
        <Field label="I am a" htmlFor="role" error={e.role} required>
          <Select id="role" name="role" icon={Users} value={role} onChange={(ev) => setRole(ev.target.value)}>
            <option value="student">Student</option>
            <option value="faculty">Faculty member</option>
            <option value="staff">Staff member</option>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="firstName" error={e.firstName} required>
            <Input id="firstName" name="firstName" icon={UserRound} autoComplete="given-name" placeholder="e.g. Juan" aria-invalid={bad("firstName")} defaultValue={v.firstName} />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={e.lastName} required>
            <Input id="lastName" name="lastName" icon={UserRound} autoComplete="family-name" placeholder="e.g. Dela Cruz" aria-invalid={bad("lastName")} defaultValue={v.lastName} />
          </Field>
        </div>
        <Field label="University ID number" htmlFor="idNumber" error={e.idNumber} required hint="Printed on your BulSU ID card.">
          <Input id="idNumber" name="idNumber" icon={IdCard} placeholder="e.g. 2023012345" aria-invalid={bad("idNumber")} defaultValue={v.idNumber} />
        </Field>
      </FormSection>

      <FormSection id="step-campus" step={2} title="University details" description="Helps the office reach the right people.">
        <Field label="College or office" htmlFor="collegeId" error={e.collegeId} required>
          <Select id="collegeId" name="collegeId" icon={Building2} defaultValue={v.collegeId ?? ""} aria-invalid={bad("collegeId")}>
            <option value="" disabled>
              Choose your college or office…
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
              <Input id="course" name="course" icon={GraduationCap} placeholder="e.g. BS Information Technology" aria-invalid={bad("course")} defaultValue={v.course} />
            </Field>
            <Field label="Year level" htmlFor="yearLevel" error={e.yearLevel} required>
              <Select id="yearLevel" name="yearLevel" icon={Layers} defaultValue={v.yearLevel ?? ""} aria-invalid={bad("yearLevel")}>
                <option value="" disabled>
                  Year…
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
              <Input id="department" name="department" icon={School} placeholder="e.g. Computer Science" aria-invalid={bad("department")} defaultValue={v.department} />
            </Field>
            <Field label="Academic rank" htmlFor="academicRank" error={e.academicRank} required>
              <Input id="academicRank" name="academicRank" icon={GraduationCap} placeholder="e.g. Instructor I" aria-invalid={bad("academicRank")} defaultValue={v.academicRank} />
            </Field>
          </div>
        )}
        {role === "staff" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Office" htmlFor="office" error={e.office} required>
              <Input id="office" name="office" icon={Building2} placeholder="e.g. Registrar's Office" aria-invalid={bad("office")} defaultValue={v.office} />
            </Field>
            <Field label="Position" htmlFor="position" error={e.position} required>
              <Input id="position" name="position" icon={Briefcase} placeholder="e.g. Administrative Aide" aria-invalid={bad("position")} defaultValue={v.position} />
            </Field>
          </div>
        )}
      </FormSection>

      <FormSection id="step-account" step={3} title="Contact and sign-in" description="You'll use this email and password to log in.">
        <Field label="Email" htmlFor="email" error={e.email} required hint="We'll send a verification link here.">
          <Input id="email" name="email" type="email" icon={Mail} autoComplete="email" placeholder="e.g. juan.delacruz@email.com" aria-invalid={bad("email")} defaultValue={v.email} />
        </Field>
        <Field label="Contact number" htmlFor="contactNo" error={e.contactNo} hint="Optional. Only the office sees it.">
          <Input id="contactNo" name="contactNo" type="tel" icon={Phone} autoComplete="tel" placeholder="e.g. 0917 123 4567" aria-invalid={bad("contactNo")} defaultValue={v.contactNo} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="password" error={e.password} required hint="At least 8 characters">
            <PasswordInput id="password" name="password" autoComplete="new-password" placeholder="Create a password" aria-invalid={bad("password")} />
          </Field>
          <Field label="Confirm password" htmlFor="confirmPassword" error={e.confirmPassword} required>
            <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" placeholder="Type it again" aria-invalid={bad("confirmPassword")} />
          </Field>
        </div>
      </FormSection>

      <FormSection id="step-consent" step={4} title="Data privacy" icon={ShieldCheck}>
        <p className="text-sm leading-relaxed text-ink-soft">
          Track-and-Trace collects your name, ID number, college, contact details, and the reports and claims
          you submit, only to help recover lost items on campus. Lost and found administrators can see this
          information. It is handled under the Data Privacy Act of 2012 (RA 10173). Read the full{" "}
          <Link href="/privacy" className="font-semibold text-crimson underline underline-offset-2" target="_blank">
            privacy notice
          </Link>
          .
        </p>
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm text-ink transition-colors has-[:checked]:border-crimson has-[:checked]:bg-crimson-tint/50 ${e.consent ? "border-berry" : "border-line-strong"}`}
        >
          <input type="checkbox" name="consent" className="mt-0.5 size-[18px] shrink-0 accent-crimson" defaultChecked={v.consent === "on"} />
          <span className="font-medium">I have read and agree to the data privacy notice.</span>
        </label>
        {e.consent && <p className="text-[13px] font-medium text-berry">{e.consent}</p>}
      </FormSection>

      <SubmitButton pending={pending} size="lg" className="w-full" pendingText="Creating account…">
        <KeyRound aria-hidden />
        Create account
      </SubmitButton>
    </form>
  );
}
