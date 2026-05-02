"use client";

import { ExternalLink, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { type ChangeEvent, type FocusEvent, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Card } from "@/components/ui";
import type { JobGenerationOutput, JobProfileDraft } from "@/lib/job-ai";
import type { Job } from "@/lib/types";
import { normalizeWorkType, workTypeOptions } from "@/lib/work-types";
import { createJob, updateJob } from "./actions";

function toText(items: string[]) {
  return items.join("\n");
}

function hostLabel(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function initialOutput(job: Job): JobGenerationOutput {
  return {
    job_description: job.generatedJobDescription,
    evaluation_rubric: normalizeRubricWeights(
      job.evaluationRubric.map((item) => ({
        category: item.name,
        weight: item.weight,
        evidence_to_look_for: item.evidence
      }))
    ),
    interview_categories: job.interviewCategories
  };
}

function formSignature(form: HTMLFormElement) {
  const formData = new FormData(form);
  const fields = [
    "business_name",
    "role_title",
    "location",
    "work_type",
    "company_values",
    "must_have_skills",
    "nice_to_have_skills",
    "interview_focus"
  ];

  return JSON.stringify(fields.map((field) => String(formData.get(field) ?? "").trim()));
}

function jobSignature(job: Job) {
  return JSON.stringify([
    job.businessName,
    job.title,
    job.location,
    job.workType,
    toText(job.companyValues),
    toText(job.mustHaves),
    toText(job.niceToHaves),
    toText(job.interviewFocus)
  ]);
}

function SubmitButton({ disabled, formId, mode }: { disabled: boolean; formId?: string; mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const label = mode === "edit" ? "Save changes" : "Save job profile";

  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-bold text-paper transition hover:bg-moss disabled:cursor-not-allowed disabled:bg-ink/30 disabled:text-paper/70"
      disabled={disabled || pending}
      form={formId}
      type="submit"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {pending ? "Saving..." : label}
    </button>
  );
}

type DraftResponse = {
  data: JobProfileDraft;
  company_context?: {
    name: string;
    url: string;
    scraped_urls: string[];
  } | null;
};

type CompanyMatch = {
  name: string;
  url: string;
  description: string;
  source: string;
};

type CompanyLookupResponse = {
  matches: CompanyMatch[];
};

type DraftFieldName = "company_values" | "must_have_skills" | "nice_to_have_skills" | "interview_focus";
type RubricItem = JobGenerationOutput["evaluation_rubric"][number];

function normalizeRubricWeights(items: RubricItem[]) {
  if (!items.length) {
    return [];
  }

  if (items.length === 1) {
    return [{ ...items[0], weight: 100 }];
  }

  const total = items.reduce((sum, item) => sum + Math.max(0, Number(item.weight) || 0), 0);

  if (total <= 0) {
    const base = Math.floor(100 / items.length);
    let remainder = 100 - base * items.length;

    return items.map((item) => ({
      ...item,
      weight: base + (remainder-- > 0 ? 1 : 0)
    }));
  }

  const scaled = items.map((item) => {
    const exact = (Math.max(0, Number(item.weight) || 0) / total) * 100;

    return {
      item,
      floor: Math.floor(exact),
      remainder: exact - Math.floor(exact)
    };
  });
  let remaining = 100 - scaled.reduce((sum, item) => sum + item.floor, 0);

  [...scaled]
    .sort((a, b) => b.remainder - a.remainder)
    .forEach((item) => {
      if (remaining > 0) {
        item.floor += 1;
        remaining -= 1;
      }
    });

  return scaled.map(({ item, floor }) => ({
    ...item,
    weight: floor
  }));
}

function rebalanceRubricWeight(items: RubricItem[], changedIndex: number, nextWeight: number) {
  if (items.length <= 1) {
    return items.map((item, index) => ({
      ...item,
      weight: index === changedIndex ? 100 : item.weight
    }));
  }

  const partnerIndex = changedIndex + 1;

  if (partnerIndex >= items.length) {
    return items;
  }

  const currentWeight = Math.max(0, Number(items[changedIndex].weight) || 0);
  const partnerWeight = Math.max(0, Number(items[partnerIndex].weight) || 0);
  const requestedWeight = Math.max(0, Math.min(100, Math.round(nextWeight || 0)));
  const maxChange = currentWeight + partnerWeight;
  const targetWeight = Math.min(requestedWeight, maxChange);
  const difference = targetWeight - currentWeight;
  const nextItems = [...items];

  nextItems[changedIndex] = {
    ...nextItems[changedIndex],
    weight: targetWeight
  };
  nextItems[partnerIndex] = {
    ...nextItems[partnerIndex],
    weight: partnerWeight - difference
  };

  return nextItems;
}

export function JobProfileForm({ job, mode = "create" }: { job: Job; mode?: "create" | "edit" }) {
  const formId = "job-profile-form";
  const formRef = useRef<HTMLFormElement>(null);
  const companyValuesRef = useRef<HTMLTextAreaElement>(null);
  const mustHaveSkillsRef = useRef<HTMLTextAreaElement>(null);
  const niceToHaveSkillsRef = useRef<HTMLTextAreaElement>(null);
  const interviewFocusRef = useRef<HTMLTextAreaElement>(null);
  const lastDraftSignatureRef = useRef("");
  const lastCompanyLookupSignatureRef = useRef("");
  const lastDraftValuesRef = useRef<Record<DraftFieldName, string> | null>(null);
  const initialSignature = useMemo(() => jobSignature(job), [job]);
  const [output, setOutput] = useState<JobGenerationOutput>(() => initialOutput(job));
  const [businessName, setBusinessName] = useState(job.businessName);
  const [roleTitle, setRoleTitle] = useState(job.title);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [draftError, setDraftError] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const [companyMatches, setCompanyMatches] = useState<CompanyMatch[]>([]);
  const [confirmedCompany, setConfirmedCompany] = useState<CompanyMatch | null>(null);
  const [companyResearchSource, setCompanyResearchSource] = useState("");
  const [isDirty, setIsDirty] = useState(mode === "create");
  const formAction = mode === "edit" ? updateJob : createJob;
  const saveDisabled = mode === "edit" && !isDirty;
  const draftFieldRefs = useMemo(
    () => ({
      company_values: companyValuesRef,
      must_have_skills: mustHaveSkillsRef,
      nice_to_have_skills: niceToHaveSkillsRef,
      interview_focus: interviewFocusRef
    }),
    []
  );

  function canApplyGeneratedDraft() {
    const lastDraftValues = lastDraftValuesRef.current;

    return (Object.entries(draftFieldRefs) as Array<[DraftFieldName, typeof companyValuesRef]>).every(([name, ref]) => {
      const currentValue = ref.current?.value.trim() ?? "";

      return !currentValue || currentValue === lastDraftValues?.[name];
    });
  }

  function currentDraftInput() {
    const currentFormData = formRef.current ? new FormData(formRef.current) : null;

    return {
      business: String(currentFormData?.get("business_name") ?? businessName).trim(),
      role: String(currentFormData?.get("role_title") ?? roleTitle).trim(),
      location: String(currentFormData?.get("location") ?? ""),
      workType: String(currentFormData?.get("work_type") ?? "")
    };
  }

  async function applyGeneratedDraft(company: CompanyMatch | null) {
    const { business, role, location, workType } = currentDraftInput();

    if (!business || !role || !canApplyGeneratedDraft()) {
      return;
    }

    const signature = JSON.stringify([business, role, location, workType, company?.url ?? "generic"]);

    if (signature === lastDraftSignatureRef.current) {
      return;
    }

    try {
      setIsGeneratingDraft(true);
      setDraftError("");

      const response = await fetch("/api/jobs/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: "generate",
          business_name: business,
          role_title: role,
          location,
          work_type: workType,
          selected_company: company
        })
      });

      if (!response.ok) {
        throw new Error("Could not generate the job profile draft.");
      }

      const payload = (await response.json()) as DraftResponse;
      const nextValues = {
        company_values: toText(payload.data.company_values),
        must_have_skills: toText(payload.data.must_have_skills),
        nice_to_have_skills: toText(payload.data.nice_to_have_skills),
        interview_focus: toText(payload.data.interview_focus)
      };

      (Object.entries(draftFieldRefs) as Array<[DraftFieldName, typeof companyValuesRef]>).forEach(([name, ref]) => {
        if (ref.current) {
          ref.current.value = nextValues[name];
        }
      });

      lastDraftValuesRef.current = nextValues;
      lastDraftSignatureRef.current = signature;
      setCompanyMatches([]);
      setConfirmedCompany(payload.company_context ? company : null);
      setCompanyResearchSource(payload.company_context?.url ?? "");
      setDraftNotice(company && !payload.company_context ? "Could not read enough company information, so this draft was generated normally." : "");
      setOutput({
        ...payload.data.job_output,
        evaluation_rubric: normalizeRubricWeights(payload.data.job_output.evaluation_rubric)
      });
      setIsDirty(true);
    } catch {
      setDraftError("Automatic draft failed. You can still fill the profile manually.");
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  async function generateDraftIfReady() {
    if (mode !== "create") {
      return;
    }

    const { business, role, location, workType } = currentDraftInput();

    if (!business || !role) {
      return;
    }

    const signature = JSON.stringify([business, role, location, workType]);

    if (signature === lastCompanyLookupSignatureRef.current || signature === lastDraftSignatureRef.current) {
      return;
    }

    if (!canApplyGeneratedDraft()) {
      return;
    }

    try {
      setIsGeneratingDraft(true);
      setDraftError("");
      setDraftNotice("");
      setCompanyResearchSource("");

      const response = await fetch("/api/jobs/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode: "lookup",
          business_name: business,
          role_title: role,
          location,
          work_type: workType
        })
      });

      if (!response.ok) {
        throw new Error("Could not look up the company.");
      }

      const payload = (await response.json()) as CompanyLookupResponse;
      lastCompanyLookupSignatureRef.current = signature;

      if (payload.matches.length) {
        setCompanyMatches(payload.matches);
        return;
      }

      await applyGeneratedDraft(null);
    } catch {
      await applyGeneratedDraft(null);
    } finally {
      setIsGeneratingDraft(false);
    }
  }

  function handleDraftFieldBlur(event: FocusEvent<HTMLInputElement>) {
    if (event.currentTarget.name === "business_name") {
      setBusinessName(event.currentTarget.value);
    }

    if (event.currentTarget.name === "role_title") {
      setRoleTitle(event.currentTarget.value);
    }

    void generateDraftIfReady();
  }

  function handleFormChange(event: ChangeEvent<HTMLFormElement>) {
    setIsDirty(formSignature(event.currentTarget) !== initialSignature);

    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      if (target instanceof HTMLSelectElement && target.name === "work_type") {
        setCompanyMatches([]);
        setConfirmedCompany(null);
        setCompanyResearchSource("");
        setDraftNotice("");
        lastCompanyLookupSignatureRef.current = "";
      }

      return;
    }

    if (["business_name", "role_title", "location"].includes(target.name)) {
      setCompanyMatches([]);
      setConfirmedCompany(null);
      setCompanyResearchSource("");
      setDraftNotice("");
      lastCompanyLookupSignatureRef.current = "";
    }

    if (target.name === "business_name") {
      setBusinessName(target.value);
    }

    if (target.name === "role_title") {
      setRoleTitle(target.value);
    }
  }

  async function refreshDraft() {
    formRef.current?.reset();

    (Object.values(draftFieldRefs) as Array<typeof companyValuesRef>).forEach((ref) => {
      if (ref.current) {
        ref.current.value = "";
      }
    });

    lastDraftValuesRef.current = null;
    lastDraftSignatureRef.current = "";
    lastCompanyLookupSignatureRef.current = "";
    setBusinessName("");
    setRoleTitle("");
    setDraftError("");
    setDraftNotice("");
    setCompanyMatches([]);
    setConfirmedCompany(null);
    setCompanyResearchSource("");
    setOutput({
      job_description: "",
      evaluation_rubric: [],
      interview_categories: []
    });
    setIsDirty(mode === "create");
  }

  function updateRubricItem(index: number, field: "category" | "evidence_to_look_for", value: string) {
    setOutput((current) => ({
      ...current,
      evaluation_rubric: current.evaluation_rubric.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    }));
    setIsDirty(true);
  }

  function updateJobDescription(value: string) {
    setOutput((current) => ({
      ...current,
      job_description: value
    }));
    setIsDirty(true);
  }

  function updateInterviewCategories(value: string) {
    setOutput((current) => ({
      ...current,
      interview_categories: value
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean)
    }));
    setIsDirty(true);
  }

  function updateRubricWeight(index: number, value: string) {
    setOutput((current) => ({
      ...current,
      evaluation_rubric: rebalanceRubricWeight(current.evaluation_rubric, index, Number(value))
    }));
    setIsDirty(true);
  }

  function addRubricItem() {
    setOutput((current) => {
      const nextRubric = [
        ...current.evaluation_rubric,
        {
          category: "New rubric item",
          weight: 0,
          evidence_to_look_for: "Describe what evidence interviewers should look for."
        }
      ];

      return {
        ...current,
        evaluation_rubric: current.evaluation_rubric.length
          ? rebalanceRubricWeight(nextRubric, nextRubric.length - 2, Math.max(0, nextRubric[nextRubric.length - 2].weight - 10))
          : rebalanceRubricWeight(nextRubric, 0, 100)
      };
    });
    setIsDirty(true);
  }

  function removeRubricItem(index: number) {
    setOutput((current) => ({
      ...current,
      evaluation_rubric: normalizeRubricWeights(current.evaluation_rubric.filter((_, itemIndex) => itemIndex !== index))
    }));
    setIsDirty(true);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="relative overflow-hidden">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Job details</h2>
          </div>
          <form
            id={formId}
            ref={formRef}
            action={formAction}
            className="mt-6 grid gap-5"
            onChange={handleFormChange}
            aria-busy={isGeneratingDraft}
          >
            <input type="hidden" name="ai_job_output" value={JSON.stringify(output)} />
            <fieldset className="m-0 grid gap-5 border-0 p-0">
              {mode === "edit" ? <input type="hidden" name="job_id" value={job.id} /> : null}
              <label className="grid gap-2 text-sm font-bold">
                Business name
                <input disabled={isGeneratingDraft} name="business_name" className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay disabled:opacity-60" defaultValue={job.businessName} onBlur={handleDraftFieldBlur} />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Role title
                <input disabled={isGeneratingDraft} name="role_title" className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay disabled:opacity-60" defaultValue={job.title} onBlur={handleDraftFieldBlur} />
              </label>
              {companyMatches.length ? (
                <div className="rounded-2xl border border-ink/10 bg-white/75 p-4">
                  <div className="flex items-start gap-3">
                    <Search className="mt-0.5 h-4 w-4 shrink-0 text-ink/60" />
                    <div>
                      <p className="text-sm font-black">Confirm the company</p>
                      <p className="mt-1 text-sm font-normal leading-6 text-ink/65">
                        Choose the matching company so the AI draft can use real company information.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {companyMatches.map((match) => (
                      <button
                        key={match.url}
                        className="rounded-2xl border border-ink/10 bg-paper p-3 text-left transition hover:border-ink/30 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isGeneratingDraft}
                        type="button"
                        onClick={() => applyGeneratedDraft(match)}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span>
                            <span className="block text-sm font-black text-ink">{match.name}</span>
                            <span className="mt-1 block text-xs font-bold text-ink/50">{match.source}</span>
                          </span>
                          <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-ink/45" />
                        </span>
                        {match.description ? <span className="mt-2 block text-sm font-normal leading-6 text-ink/65">{match.description}</span> : null}
                      </button>
                    ))}
                  </div>
                  <button
                    className="mt-3 inline-flex items-center justify-center rounded-full border border-ink/20 bg-white px-4 py-2 text-sm font-bold text-ink transition hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isGeneratingDraft}
                    type="button"
                    onClick={() => applyGeneratedDraft(null)}
                  >
                    Generate without a company match
                  </button>
                </div>
              ) : null}
              {confirmedCompany ? (
                <p className="rounded-2xl bg-white/70 p-3 text-sm font-bold text-ink/65">
                  Draft based on {confirmedCompany.name}
                  {companyResearchSource ? ` (${hostLabel(companyResearchSource)})` : ""}.
                </p>
              ) : null}
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  Location
                  <input name="location" className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay" defaultValue={job.location} />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Work type
                  <select
                    name="work_type"
                    className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay"
                    defaultValue={normalizeWorkType(job.workType) ?? ""}
                  >
                    <option value="">Select work type</option>
                    {workTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold">
                <span className="inline-flex items-center gap-2">
                  Company values
                  {isGeneratingDraft ? <Loader2 className="h-4 w-4 animate-spin text-ink" /> : null}
                </span>
                <textarea disabled={isGeneratingDraft} ref={companyValuesRef} name="company_values" className="min-h-24 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay disabled:opacity-60" defaultValue={toText(job.companyValues)} />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                <span className="inline-flex items-center gap-2">
                  Must-have skills
                  {isGeneratingDraft ? <Loader2 className="h-4 w-4 animate-spin text-ink" /> : null}
                </span>
                <textarea disabled={isGeneratingDraft} ref={mustHaveSkillsRef} name="must_have_skills" className="min-h-32 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay disabled:opacity-60" defaultValue={toText(job.mustHaves)} />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                <span className="inline-flex items-center gap-2">
                  Nice-to-have skills
                  {isGeneratingDraft ? <Loader2 className="h-4 w-4 animate-spin text-ink" /> : null}
                </span>
                <textarea disabled={isGeneratingDraft} ref={niceToHaveSkillsRef} name="nice_to_have_skills" className="min-h-24 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay disabled:opacity-60" defaultValue={toText(job.niceToHaves)} />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                <span className="inline-flex items-center gap-2">
                  Interview focus
                  {isGeneratingDraft ? <Loader2 className="h-4 w-4 animate-spin text-ink" /> : null}
                </span>
                <textarea disabled={isGeneratingDraft} ref={interviewFocusRef} name="interview_focus" className="min-h-32 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay disabled:opacity-60" defaultValue={toText(job.interviewFocus)} />
              </label>
              {draftError ? <p className="text-sm font-bold text-red-700">{draftError}</p> : null}
              {draftNotice ? <p className="text-sm font-bold text-ink/60">{draftNotice}</p> : null}
            </fieldset>
          </form>
        </Card>

        <div className="space-y-6">
          <Card>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-ink/60">
              AI output
              {isGeneratingDraft ? <Loader2 className="h-4 w-4 animate-spin text-ink" /> : null}
            </p>
            <h2 className="mt-1 text-2xl font-black">Generated job kit</h2>
            <div className="mt-5 space-y-4 text-sm leading-6 text-ink/70">
              <label className="grid gap-2 text-sm font-bold text-ink">
                Job description
                <textarea
                  className="min-h-40 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 text-ink/70 outline-none focus:border-clay disabled:opacity-60"
                  disabled={isGeneratingDraft}
                  value={output.job_description}
                  onChange={(event) => updateJobDescription(event.target.value)}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-ink">
                Interview categories
                <textarea
                  className="min-h-28 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 text-ink/70 outline-none focus:border-clay disabled:opacity-60"
                  disabled={isGeneratingDraft}
                  value={toText(output.interview_categories)}
                  onChange={(event) => updateInterviewCategories(event.target.value)}
                />
              </label>
            </div>
          </Card>
          <Card className="relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-ink/60">Evaluation rubric</p>
              <p className="mt-1 text-sm font-bold text-ink">
                Total {output.evaluation_rubric.reduce((sum, item) => sum + item.weight, 0)}%
              </p>
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 bg-paper px-4 py-2 text-sm font-bold text-ink transition hover:border-ink/40"
              disabled={isGeneratingDraft}
              type="button"
              onClick={addRubricItem}
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {output.evaluation_rubric.length ? (
              output.evaluation_rubric.map((item, index) => (
                <div key={`${item.category}-${index}`} className="rounded-2xl bg-white/70 p-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_80px_44px] sm:items-end">
                    <label className="grid gap-2 text-sm font-bold">
                      Rubric item
                      <input
                        className="rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal outline-none focus:border-clay"
                        disabled={isGeneratingDraft}
                        value={item.category}
                        onChange={(event) => updateRubricItem(index, "category", event.target.value)}
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-bold">
                      Weight
                      <span className="relative">
                        <input
                          className="w-full rounded-2xl border border-ink/10 bg-white/70 py-3 pl-3 pr-7 text-center font-normal outline-none focus:border-clay"
                          disabled={isGeneratingDraft}
                          readOnly={index === output.evaluation_rubric.length - 1}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          type="text"
                          value={item.weight}
                          onChange={(event) => updateRubricWeight(index, event.target.value)}
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-ink/45">
                          %
                        </span>
                      </span>
                    </label>
                    <button
                      className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isGeneratingDraft || output.evaluation_rubric.length <= 1}
                      type="button"
                      onClick={() => removeRubricItem(index)}
                      aria-label="Delete rubric item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <label className="mt-3 grid gap-2 text-sm font-bold">
                    Evidence to look for
                    <textarea
                      className="min-h-24 rounded-2xl border border-ink/10 bg-white/70 p-3 font-normal leading-6 outline-none focus:border-clay"
                      disabled={isGeneratingDraft}
                      value={item.evidence_to_look_for}
                      onChange={(event) => updateRubricItem(index, "evidence_to_look_for", event.target.value)}
                    />
                  </label>
                </div>
              ))
            ) : (
              <p className="rounded-2xl bg-white/70 p-4 text-sm leading-6 text-ink/70">
                Add a rubric item to define how candidates should be evaluated.
              </p>
            )}
          </div>
          {isGeneratingDraft ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-paper/80 p-6 backdrop-blur-sm">
              <div className="w-full max-w-xs rounded-2xl border border-ink/10 bg-white p-5 text-center shadow-panel">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-ink" />
                <p className="mt-3 text-sm font-black text-navy">Preparing draft</p>
              </div>
            </div>
          ) : null}
          </Card>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <button
          className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 bg-paper px-5 py-3 text-sm font-bold text-ink transition hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isGeneratingDraft}
          type="button"
          onClick={refreshDraft}
        >
          {isGeneratingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
        <SubmitButton disabled={saveDisabled || isGeneratingDraft} formId={formId} mode={mode} />
      </div>
    </div>
  );
}
