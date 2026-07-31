-- AlphaQuiz security hardening
-- Run this once in the Supabase SQL Editor for an existing installation.

alter table public.exam_attempts
  add column if not exists "accessTokenHash" text,
  add column if not exists "updatedAt" timestamptz not null default now();

create index if not exists exam_attempts_publication_started_idx
  on public.exam_attempts ("publicationId", "startedAt" desc);

create index if not exists exam_events_attempt_created_idx
  on public.exam_events ("attemptId", "createdAt" desc);

create index if not exists exam_events_publication_created_idx
  on public.exam_events ("publicationId", "createdAt" desc);

alter table public.categories enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.exports enable row level security;
alter table public.exam_publications enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.exam_instances enable row level security;
alter table public.exam_events enable row level security;

revoke all on table public.categories from anon, authenticated;
revoke all on table public.topics from anon, authenticated;
revoke all on table public.questions from anon, authenticated;
revoke all on table public.answers from anon, authenticated;
revoke all on table public.quizzes from anon, authenticated;
revoke all on table public.quiz_questions from anon, authenticated;
revoke all on table public.exports from anon, authenticated;
revoke all on table public.exam_publications from anon, authenticated;
revoke all on table public.exam_attempts from anon, authenticated;
revoke all on table public.exam_instances from anon, authenticated;
revoke all on table public.exam_events from anon, authenticated;
