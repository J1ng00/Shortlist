# AI Hiring Copilot for SMEs

An AI-assisted hiring workflow that helps managers make **structured, evidence-based decisions** — without taking control away from them.

---

## What It Does

This app supports a focused end-to-end hiring flow:

1. Create a job with role requirements and values  
2. Upload a candidate (resume + optional links/notes)  
3. Generate an AI-powered candidate summary and fit score  
4. Run a live interview with AI follow-up suggestions  
5. Produce a final hiring recommendation memo  

> Designed as a **narrow, high-signal MVP** — no unnecessary features or distractions.

---

## Key Features

- **Job Setup + AI Rubric**
  - Generates structured evaluation criteria from role inputs  

- **Candidate Analysis**
  - Extracts resume insights  
  - Identifies strengths, gaps, and risks  
  - Produces an initial fit score  

- **Pre-Interview Scorecard**
  - Evidence-based breakdown of candidate fit  
  - Clear areas to validate during interview  

- **Live Interview Copilot**
  - Suggests follow-up questions in real time  
  - Flags vague or incomplete answers  
  - Adjusts evaluation dynamically  

- **Final Hiring Memo**
  - Structured recommendation: `advance`, `review`, or `do_not_progress`  
  - Clear reasoning, strengths, and concerns  

---

## Product Principles

- Human stays in control  
- Decisions are **structured, not gut-based**  
- Scores must be tied to **evidence**  
- Surface uncertainty and missing signals  
- Avoid biased language (use *values alignment*, not “culture fit”)  

---

## Tech Stack

- **Frontend:** Next.js, React, Tailwind  
- **Backend:** Next.js API routes  
- **Database & Storage:** Supabase  
- **AI:** OpenAI (structured JSON outputs)

---

## Project Structure

```txt
src/
  app/
    jobs/new/
    candidates/[id]/
    interview/[id]/
    recommendation/[id]/
    api/
  components/
  lib/
supabase/
```

---

## Running Locally

```
npm install
npm run dev
```

**Environment Variables**
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4
```
---

## Health Check

```
/api/health/supabase
```
Returns
```
{
  "ok": true
}
```
---

## Scope
This is an MVP built for a hackathon. It intentionally excludes:

- Job board integrations
- Salary benchmarking
- Team management
- Analytics dashboards
- Advanced authentication

---

## Demo Flow
1. Create a job
2. Upload a candidate resume
3. Review AI-generated scorecard
4. Run interview with copilot assistance
5. Generate final hiring memo


