-- AI Hiring Copilot for SMEs: hackathon MVP schema.
-- Principle: keep the manager in control and persist structured JSON AI outputs.

create extension if not exists pgcrypto;

drop table if exists public.interview_sessions;
drop table if exists public.candidates;
drop table if exists public.jobs;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  role_title text not null,
  business_name text not null,
  location text,
  work_type text,
  company_values text[] not null default '{}',
  must_have_skills text[] not null default '{}',
  nice_to_have_skills text[] not null default '{}',
  interview_focus text[] not null default '{}',
  ai_job_output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.jobs.ai_job_output is
  'JSON shape: { job_description, evaluation_rubric, interview_categories }';

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  current_position text,
  github_url text,
  linkedin_url text,
  profile_notes text,
  manual_profile_notes text,
  resume_file_path text,
  resume_text text,
  ai_candidate_output jsonb not null default '{}'::jsonb,
  initial_fit_score integer check (initial_fit_score between 0 and 100),
  stage text not null default 'review' check (stage in ('review', 'interview', 'reject', 'hired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.candidates.resume_file_path is
  'Path inside Supabase Storage bucket candidate-resumes.';

comment on column public.candidates.ai_candidate_output is
  'JSON shape: { status, extracted_profile, extracted_skills, strengths, missing_requirements, areas_to_validate, skill_match, initial_fit_score, suggested_screening_questions }';

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  interviewer_name text,
  notes text not null default '',
  ai_interview_output jsonb not null default '{}'::jsonb,
  final_decision_output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.interview_sessions.ai_interview_output is
  'JSON shape: { follow_up_questions, inconsistencies_to_probe, rubric_score_updates, missing_evidence }';

comment on column public.interview_sessions.final_decision_output is
  'JSON shape: { recommendation: advance|review|do_not_progress, confidence, supporting_evidence, concerns, next_step }';

create index jobs_created_at_idx on public.jobs(created_at desc);
create index candidates_job_id_idx on public.candidates(job_id);
create index candidates_stage_idx on public.candidates(stage);
create index interview_sessions_candidate_id_idx on public.interview_sessions(candidate_id);

-- Supabase Storage setup:
insert into storage.buckets (id, name, public)
values ('candidate-resumes', 'candidate-resumes', false)
on conflict (id) do update set public = excluded.public;

-- Store uploaded resumes at: {job_id}/{candidate_id}/resume.pdf.
-- MVP policy: allows browser/server code using the anon key to upload and read resumes.
-- Replace with authenticated, owner-scoped policies before production use.
drop policy if exists "candidate resume uploads are allowed for mvp" on storage.objects;
drop policy if exists "candidate resume reads are allowed for mvp" on storage.objects;
drop policy if exists "candidate resume updates are allowed for mvp" on storage.objects;

create policy "candidate resume uploads are allowed for mvp"
on storage.objects for insert
to anon
with check (bucket_id = 'candidate-resumes');

create policy "candidate resume reads are allowed for mvp"
on storage.objects for select
to anon
using (bucket_id = 'candidate-resumes');

create policy "candidate resume updates are allowed for mvp"
on storage.objects for update
to anon
using (bucket_id = 'candidate-resumes')
with check (bucket_id = 'candidate-resumes');


