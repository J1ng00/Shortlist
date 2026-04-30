alter table public.candidates
  drop constraint if exists candidates_stage_check;

alter table public.candidates
  add constraint candidates_stage_check
  check (stage in ('review', 'interview', 'decision', 'rejected'));
