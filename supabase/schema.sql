create table if not exists public.categories (
  id text primary key,
  name text not null,
  color text not null default '#6f8785'
);

create table if not exists public.topics (
  id text primary key,
  "categoryId" text not null references public.categories(id) on delete cascade,
  name text not null
);

create table if not exists public.questions (
  id text primary key,
  title text not null,
  description text not null default '',
  image jsonb,
  type text not null,
  "categoryId" text references public.categories(id),
  "topicId" text references public.topics(id),
  points integer not null default 1,
  shuffle boolean not null default true
);

create table if not exists public.answers (
  id text primary key,
  "questionId" text not null references public.questions(id) on delete cascade,
  text text not null default '',
  correct boolean not null default false,
  position integer not null default 0
);

create table if not exists public.quizzes (
  id text primary key,
  title text not null,
  description text not null default '',
  "categoryId" text references public.categories(id),
  status text not null default 'draft',
  "passPercentage" integer not null default 70,
  "scoringMode" text not null default 'combined',
  "topicPassPercentages" jsonb not null default '{}'::jsonb,
  "hiddenTopicIds" jsonb not null default '[]'::jsonb,
  "updatedAt" timestamptz not null default now()
);

alter table public.questions
  add column if not exists "topicId" text references public.topics(id),
  add column if not exists image jsonb;

alter table public.quizzes
  add column if not exists "passPercentage" integer not null default 70,
  add column if not exists "scoringMode" text not null default 'combined',
  add column if not exists "topicPassPercentages" jsonb not null default '{}'::jsonb,
  add column if not exists "hiddenTopicIds" jsonb not null default '[]'::jsonb;

create table if not exists public.quiz_questions (
  "quizId" text not null references public.quizzes(id) on delete cascade,
  "questionId" text not null references public.questions(id) on delete cascade,
  position integer not null default 0,
  primary key ("quizId", "questionId")
);

create table if not exists public.exports (
  id text primary key,
  "quizId" text not null references public.quizzes(id) on delete cascade,
  format text not null,
  "fileName" text not null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public.exam_publications (
  id text primary key,
  "quizId" text not null references public.quizzes(id) on delete cascade,
  slug text not null unique,
  mode text not null default 'closed',
  "timeLimit" integer not null default 45,
  "maxViolations" integer not null default 2,
  active boolean not null default true,
  "sendResults" boolean not null default true,
  randomization jsonb not null default '{
    "questionOrderMode":"fixed",
    "useTopics":true,
    "questionCountByTopic":{},
    "shuffleAnswers":false,
    "requiredQuestionIds":[],
    "lockedQuestionIds":[],
    "retryMode":"regenerate"
  }'::jsonb,
  "availableFrom" timestamptz,
  "availableUntil" timestamptz,
  "createdAt" timestamptz not null default now()
);

alter table public.exam_publications
  add column if not exists "availableFrom" timestamptz,
  add column if not exists "availableUntil" timestamptz,
  add column if not exists randomization jsonb not null default '{
    "questionOrderMode":"fixed",
    "useTopics":true,
    "questionCountByTopic":{},
    "shuffleAnswers":false,
    "requiredQuestionIds":[],
    "lockedQuestionIds":[],
    "retryMode":"regenerate"
  }'::jsonb;

create table if not exists public.exam_attempts (
  id text primary key,
  "publicationId" text not null references public.exam_publications(id) on delete cascade,
  name text not null,
  email text not null,
  status text not null default 'in-progress',
  "startedAt" timestamptz not null default now(),
  "submittedAt" timestamptz,
  "currentQuestion" integer not null default 0,
  responses jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  possible integer not null default 0,
  percentage integer not null default 0,
  passed boolean not null default false,
  "topicResults" jsonb not null default '[]'::jsonb,
  "violationCount" integer not null default 0,
  "resultEmailStatus" text not null default 'pending',
  "accessTokenHash" text,
  "updatedAt" timestamptz not null default now()
);

alter table public.exam_attempts
  add column if not exists "accessTokenHash" text,
  add column if not exists "updatedAt" timestamptz not null default now();

create index if not exists exam_attempts_publication_started_idx
  on public.exam_attempts ("publicationId", "startedAt" desc);

create unique index if not exists exam_attempts_one_active_per_email
  on public.exam_attempts ("publicationId", lower(email))
  where status <> 'reset';

create table if not exists public.exam_instances (
  id text primary key,
  "attemptId" text not null unique references public.exam_attempts(id) on delete cascade,
  "publicationId" text not null references public.exam_publications(id) on delete cascade,
  "quizId" text not null,
  "studentKey" text not null,
  "questionOrder" jsonb not null,
  "topicOrder" jsonb not null,
  "answerOrderByQuestionId" jsonb not null,
  snapshot jsonb not null,
  seed text not null,
  "generatedAt" timestamptz not null default now(),
  "previousAttemptId" text
);

create table if not exists public.exam_events (
  id text primary key,
  "publicationId" text not null references public.exam_publications(id) on delete cascade,
  "attemptId" text not null references public.exam_attempts(id) on delete cascade,
  type text not null,
  message text not null,
  "createdAt" timestamptz not null default now()
);

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

grant usage on schema public to service_role;
grant all privileges on table public.categories to service_role;
grant all privileges on table public.topics to service_role;
grant all privileges on table public.questions to service_role;
grant all privileges on table public.answers to service_role;
grant all privileges on table public.quizzes to service_role;
grant all privileges on table public.quiz_questions to service_role;
grant all privileges on table public.exports to service_role;
grant all privileges on table public.exam_publications to service_role;
grant all privileges on table public.exam_attempts to service_role;
grant all privileges on table public.exam_instances to service_role;
grant all privileges on table public.exam_events to service_role;

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
