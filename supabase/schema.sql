create table if not exists public.categories (
  id text primary key,
  name text not null,
  color text not null default '#6f8785'
);

create table if not exists public.questions (
  id text primary key,
  title text not null,
  description text not null default '',
  type text not null,
  "categoryId" text references public.categories(id),
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
  "updatedAt" timestamptz not null default now()
);

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

alter table public.categories enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.exports enable row level security;

grant usage on schema public to service_role;
grant all privileges on table public.categories to service_role;
grant all privileges on table public.questions to service_role;
grant all privileges on table public.answers to service_role;
grant all privileges on table public.quizzes to service_role;
grant all privileges on table public.quiz_questions to service_role;
grant all privileges on table public.exports to service_role;
