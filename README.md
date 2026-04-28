# AI Hiring Copilot for SMEs

Hackathon MVP for structured, evidence-based hiring with a human manager in control.

Build only this:

1. Manager creates a job.
2. Manager uploads a candidate resume.
3. AI returns a candidate summary and score.
4. Manager runs a live interview with AI follow-up suggestions.
5. AI generates a final hiring recommendation memo.

This is intentionally narrow. Do not add onboarding, salary benchmarking, job board posting, team management, analytics, or advanced auth during the MVP.

## What Is Done

- Next.js + React + Tailwind app scaffold is in place.
- Core demo routes exist:
  - `/`
  - `/jobs/new`
  - `/candidates/cand-maya`
  - `/interview/cand-maya`
  - `/recommendation/cand-maya`
- Mock data exists for one complete demo flow in `src/lib/mock-data.ts`.
- Shared layout and UI primitives exist in `src/components`.
- Supabase schema exists in `supabase/schema.sql`.
- Supabase client helpers exist:
  - `src/lib/supabase/client.ts`
  - `src/lib/supabase/server.ts`
- Supabase health check route exists:
  - `/api/health/supabase`
- Supabase connection has been verified through the health route.
- Job creation form at `/jobs/new` now inserts into the Supabase `jobs` table.
- Mock API routes exist for the 4 AI flows plus resume upload:
  - `POST /api/jobs/generate`
  - `POST /api/candidates/analyze`
  - `POST /api/interview/copilot`
  - `POST /api/recommendation/generate`
  - `POST /api/resumes/upload`
- Typecheck and production build have passed.

## Current MVP Checklist

### 1. Job Setup

Manager enters:

- [x] Role title
- [x] Company values
- [x] Must-have skills
- [x] Nice-to-have skills
- [x] Interview focus

AI outputs:

- [x] Short job summary, currently mock data
- [x] Evaluation rubric, currently mock data
- [x] Interview categories, currently mock data
- [ ] Replace mock rubric generation with OpenAI
- [ ] Save generated rubric JSON into `jobs.ai_job_output`

### 2. Candidate Upload

Manager uploads or enters:

- [ ] Resume PDF
- [ ] Optional GitHub URL
- [ ] Optional LinkedIn URL or manual profile notes

AI outputs:

- [x] Extracted candidate profile, currently mock data
- [x] Skill match, currently mock data
- [x] Missing requirements, currently mock data
- [x] Suggested screening questions, currently mock data
- [ ] Add real candidate creation form
- [ ] Add Supabase Storage upload to `candidate-resumes`
- [ ] Extract resume text
- [ ] Replace mock candidate analysis with OpenAI
- [ ] Save candidate analysis JSON into `candidates.ai_candidate_output`

### 3. Pre-Interview Scorecard

Show:

- [x] Match score
- [x] Strengths
- [x] Risks / concerns
- [x] Evidence found
- [x] Things to verify in interview
- [ ] Load scorecard from Supabase instead of mock data

### 4. Live Interview Copilot

Manager asks questions manually.

During interview:

- [x] Manager can type notes/transcript into the UI
- [x] AI suggests follow-up questions, currently mock logic
- [x] AI highlights vague or incomplete answers, currently mock data
- [x] AI updates rubric score live, currently mock data
- [ ] Persist interview notes to `interview_sessions.notes`
- [ ] Replace mock suggestions with OpenAI
- [ ] Save live AI output into `interview_sessions.ai_interview_output`

### 5. Final Decision Memo

Generate:

- [x] `advance` / `review` / `do_not_progress`, currently mock data
- [x] Reasoning / explanation, currently mock data
- [x] Evidence summary, currently mock data
- [x] Unanswered concerns, currently mock data
- [x] Recommended next step, currently mock data
- [ ] Replace mock memo with OpenAI
- [ ] Save final memo JSON into `interview_sessions.final_decision_output`

## Best User Flow

1. Create job.
2. AI generates rubric.
3. Upload resume.
4. AI extracts candidate info and scores fit.
5. Start interview session.
6. Paste notes or transcript chunks.
7. AI suggests next question.
8. Generate final hiring memo.

## OpenAI Flows

You only need 4 AI actions.

### 1. Generate Rubric

Input:

- Job title
- Company values
- Required skills
- Nice-to-have skills
- Interview focus

Output JSON:

```json
{
  "scoring_categories": [
    {
      "name": "string",
      "weight": 35,
      "evidence_to_look_for": "string"
    }
  ],
  "red_flags": ["string"],
  "suggested_interview_questions": ["string"]
}
```

### 2. Parse Candidate

Input:

- Resume text
- Job rubric
- Optional GitHub URL
- Optional LinkedIn URL or manual profile notes

Output JSON:

```json
{
  "extracted_skills": ["string"],
  "strengths": ["string"],
  "missing_skills": ["string"],
  "risks": ["string"],
  "interview_focus_areas": ["string"],
  "initial_fit_score": 82
}
```

### 3. Suggest Live Follow-Ups

Input:

- Job rubric
- Candidate summary
- Current transcript chunk

Output JSON:

```json
{
  "follow_up_questions": ["string"],
  "inconsistencies_to_probe": ["string"],
  "score_adjustments": [
    {
      "category": "string",
      "change": "+1",
      "reason": "string"
    }
  ],
  "missing_evidence": ["string"]
}
```

### 4. Final Hiring Memo

Input:

- Rubric
- Candidate profile
- Transcript
- Live scores

Output JSON:

```json
{
  "recommendation": "advance",
  "explanation": "string",
  "strengths": ["string"],
  "concerns": ["string"],
  "next_step": "string"
}
```

Allowed recommendation values:

- `advance`
- `review`
- `do_not_progress`

Display `do_not_progress` as `do not progress` in the UI.

## Supabase Schema

Use three core tables:

- `jobs`: stores job setup fields and generated rubric JSON.
- `candidates`: stores candidate details, resume storage path/text, optional profile links/notes, and candidate AI analysis JSON.
- `interview_sessions`: stores notes, live interview AI output, and final decision memo JSON.

Use one private Supabase Storage bucket:

- Bucket: `candidate-resumes`
- Path format: `{job_id}/{candidate_id}/resume.pdf`

Full SQL is in `supabase/schema.sql`.

## Folder Structure

```txt
src/
  app/
    page.tsx
    jobs/new/page.tsx
    candidates/[id]/page.tsx
    interview/[id]/page.tsx
    recommendation/[id]/page.tsx
    api/
      jobs/generate/route.ts
      candidates/analyze/route.ts
      interview/copilot/route.ts
      recommendation/generate/route.ts
      resumes/upload/route.ts
      health/supabase/route.ts
  components/
    page-shell.tsx
    ui.tsx
    interview-workspace.tsx
  lib/
    ai-json-contracts.ts
    mock-data.ts
    supabase/client.ts
    supabase/server.ts
    types.ts
    utils.ts
supabase/
  schema.sql
```

## Next Build Steps

Do these in order:

1. Add a candidate upload/create page or section.
2. Insert candidates into Supabase with optional GitHub/LinkedIn/profile notes.
3. Upload resume PDFs to Supabase Storage.
4. Extract resume text.
5. Replace `POST /api/jobs/generate` mock response with OpenAI.
6. Replace `POST /api/candidates/analyze` mock response with OpenAI.
7. Persist interview sessions and notes.
8. Replace `POST /api/interview/copilot` mock response with OpenAI.
9. Replace `POST /api/recommendation/generate` mock response with OpenAI.
10. Polish the single demo path.

## 4-Person Hackathon Split

- Person 1, frontend: pages, forms, navigation, scorecard, loading states, demo polish.
- Person 2, Supabase: schema, storage bucket, server actions, inserts/selects, candidate upload.
- Person 3, OpenAI: prompts, JSON schemas, API routes, fallback mock responses.
- Person 4, demo content: sample job, sample resume, rubric wording, final memo quality, presentation script.

Recommended order:

1. Person 1 keeps UI working with mocks.
2. Person 2 connects job and candidate persistence.
3. Person 3 swaps one mock AI route at a time.
4. Person 4 tests the story and tightens output language.

## Product Language Rules

- Human stays in control.
- Avoid `culture fit`; use `values alignment` or `working style alignment`.
- Avoid auto-rejection language in UI.
- Use `advance`, `review`, or `do_not_progress` for structured decisions.
- Tie scores to evidence.
- Show uncertainty and missing evidence.

## Development

```bash
npm install
npm run dev
```

Check Supabase connection:

```txt
http://localhost:3000/api/health/supabase
```

Expected response:

```json
{
  "ok": true,
  "message": "Supabase connection works and the jobs table is reachable."
}
```
