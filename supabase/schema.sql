create table if not exists public.categories (
  id text primary key,
  user_id uuid not null references auth.users(id),
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
  user_id uuid not null references auth.users(id),
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
  user_id uuid not null references auth.users(id),
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
  user_id uuid not null references auth.users(id),
  "quizId" text not null references public.quizzes(id) on delete cascade,
  format text not null,
  "fileName" text not null,
  "createdAt" timestamptz not null default now()
);

-- CREATE TABLE IF NOT EXISTS does not add columns to legacy installations.
-- Upgrade ownership before creating indexes or enabling the RLS policies below.
alter table public.categories add column if not exists user_id uuid;
alter table public.questions add column if not exists user_id uuid;
alter table public.quizzes add column if not exists user_id uuid;
alter table public.exports add column if not exists user_id uuid;

do $$
declare
  auth_user_count bigint;
  legacy_owner_id uuid;
begin
  if exists (
    select 1 from public.categories where user_id is null
    union all
    select 1 from public.questions where user_id is null
    union all
    select 1 from public.quizzes where user_id is null
    union all
    select 1 from public.exports where user_id is null
  ) then
    select count(*) into auth_user_count from auth.users;

    if auth_user_count <> 1 then
      raise exception using
        message = format(
          'AlphaQuiz ownership migration requires exactly one Auth user for legacy data; found %s.',
          auth_user_count
        ),
        hint = 'Assign user_id explicitly to legacy rows before applying this schema.';
    end if;

    select id into legacy_owner_id
    from auth.users
    order by created_at, id
    limit 1;

    update public.categories set user_id = legacy_owner_id where user_id is null;
    update public.questions set user_id = legacy_owner_id where user_id is null;
    update public.quizzes set user_id = legacy_owner_id where user_id is null;
    update public.exports set user_id = legacy_owner_id where user_id is null;
  end if;
end
$$;

-- Rate limits live outside public so they cannot be queried through PostgREST.
-- Only this atomic SECURITY DEFINER function is exposed to anon/authenticated.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.request_rate_limits (
  key_hash text primary key,
  request_count integer not null,
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

revoke all on table private.request_rate_limits from public, anon, authenticated;

create index if not exists request_rate_limits_reset_at_idx
  on private.request_rate_limits (reset_at);

create or replace function public.consume_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = private, pg_temp
as $$
declare
  current_count integer;
  current_reset timestamptz;
  current_time timestamptz := clock_timestamp();
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
    or p_limit < 1
    or p_window_seconds < 1
    or p_window_seconds > 604800 then
    raise exception 'invalid rate limit arguments';
  end if;

  delete from private.request_rate_limits
  where key_hash in (
    select key_hash
    from private.request_rate_limits
    where reset_at < current_time - interval '1 day'
    order by reset_at
    limit 100
  );

  insert into private.request_rate_limits as rate_limit (
    key_hash,
    request_count,
    reset_at,
    updated_at
  )
  values (
    p_key_hash,
    1,
    current_time + make_interval(secs => p_window_seconds),
    current_time
  )
  on conflict (key_hash) do update
  set
    request_count = case
      when rate_limit.reset_at <= current_time then 1
      else least(rate_limit.request_count + 1, p_limit + 1)
    end,
    reset_at = case
      when rate_limit.reset_at <= current_time
        then current_time + make_interval(secs => p_window_seconds)
      else rate_limit.reset_at
    end,
    updated_at = current_time
  returning request_count, reset_at
  into current_count, current_reset;

  allowed := current_count <= p_limit;
  retry_after := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from current_reset - current_time))::integer)
  end;
  return next;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer)
  from public;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to anon, authenticated;

notify pgrst, 'reload schema';

alter table public.categories alter column user_id set not null;
alter table public.questions alter column user_id set not null;
alter table public.quizzes alter column user_id set not null;
alter table public.exports alter column user_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_user_id_fkey'
      and conrelid = 'public.categories'::regclass
  ) then
    alter table public.categories
      add constraint categories_user_id_fkey
      foreign key (user_id) references auth.users(id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'questions_user_id_fkey'
      and conrelid = 'public.questions'::regclass
  ) then
    alter table public.questions
      add constraint questions_user_id_fkey
      foreign key (user_id) references auth.users(id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'quizzes_user_id_fkey'
      and conrelid = 'public.quizzes'::regclass
  ) then
    alter table public.quizzes
      add constraint quizzes_user_id_fkey
      foreign key (user_id) references auth.users(id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'exports_user_id_fkey'
      and conrelid = 'public.exports'::regclass
  ) then
    alter table public.exports
      add constraint exports_user_id_fkey
      foreign key (user_id) references auth.users(id);
  end if;
end
$$;

create index if not exists categories_user_id_idx on public.categories (user_id);
create index if not exists questions_user_id_idx on public.questions (user_id);
create index if not exists quizzes_user_id_idx on public.quizzes (user_id);
create index if not exists exports_user_id_idx on public.exports (user_id);
create index if not exists answers_question_id_idx
  on public.answers ("questionId");
create index if not exists topics_category_id_idx
  on public.topics ("categoryId");

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

create index if not exists exam_publications_quiz_id_idx
  on public.exam_publications ("quizId");

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

create index if not exists exam_instances_publication_id_idx
  on public.exam_instances ("publicationId");

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

do $$
declare
  policy_rule record;
begin
  for policy_rule in
    select *
    from (
      values
        ('categories', '((select auth.uid()) = user_id)'),
        (
          'topics',
          'exists (select 1 from public.categories as category where category.id = topics."categoryId" and category.user_id = (select auth.uid()))'
        ),
        ('questions', '((select auth.uid()) = user_id)'),
        (
          'answers',
          'exists (select 1 from public.questions as question where question.id = answers."questionId" and question.user_id = (select auth.uid()))'
        ),
        ('quizzes', '((select auth.uid()) = user_id)'),
        (
          'quiz_questions',
          'exists (select 1 from public.quizzes as quiz where quiz.id = quiz_questions."quizId" and quiz.user_id = (select auth.uid())) and exists (select 1 from public.questions as question where question.id = quiz_questions."questionId" and question.user_id = (select auth.uid()))'
        ),
        ('exports', '((select auth.uid()) = user_id)'),
        (
          'exam_publications',
          'exists (select 1 from public.quizzes as quiz where quiz.id = exam_publications."quizId" and quiz.user_id = (select auth.uid()))'
        ),
        (
          'exam_attempts',
          'exists (select 1 from public.exam_publications as publication join public.quizzes as quiz on quiz.id = publication."quizId" where publication.id = exam_attempts."publicationId" and quiz.user_id = (select auth.uid()))'
        ),
        (
          'exam_instances',
          'exists (select 1 from public.exam_publications as publication join public.quizzes as quiz on quiz.id = publication."quizId" where publication.id = exam_instances."publicationId" and quiz.user_id = (select auth.uid()))'
        ),
        (
          'exam_events',
          'exists (select 1 from public.exam_publications as publication join public.quizzes as quiz on quiz.id = publication."quizId" where publication.id = exam_events."publicationId" and quiz.user_id = (select auth.uid()))'
        )
    ) as ownership(table_name, predicate)
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_rule.table_name || '_select_own',
      policy_rule.table_name
    );
    execute format(
      'create policy %I on public.%I for select to authenticated using (%s)',
      policy_rule.table_name || '_select_own',
      policy_rule.table_name,
      policy_rule.predicate
    );

    execute format(
      'drop policy if exists %I on public.%I',
      policy_rule.table_name || '_insert_own',
      policy_rule.table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (%s)',
      policy_rule.table_name || '_insert_own',
      policy_rule.table_name,
      policy_rule.predicate
    );

    execute format(
      'drop policy if exists %I on public.%I',
      policy_rule.table_name || '_update_own',
      policy_rule.table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (%s) with check (%s)',
      policy_rule.table_name || '_update_own',
      policy_rule.table_name,
      policy_rule.predicate,
      policy_rule.predicate
    );

    execute format(
      'drop policy if exists %I on public.%I',
      policy_rule.table_name || '_delete_own',
      policy_rule.table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (%s)',
      policy_rule.table_name || '_delete_own',
      policy_rule.table_name,
      policy_rule.predicate
    );
  end loop;
end
$$;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table
  public.categories,
  public.topics,
  public.questions,
  public.answers,
  public.quizzes,
  public.quiz_questions,
  public.exports,
  public.exam_publications,
  public.exam_attempts,
  public.exam_instances,
  public.exam_events
to authenticated;

do $$
declare
  tables_without_rls text;
  missing_crud_policies text;
begin
  select string_agg(format('%I.%I', namespace.nspname, relation.relname), ', ')
  into tables_without_rls
  from pg_class as relation
  join pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and not relation.relrowsecurity;

  if tables_without_rls is not null then
    raise exception 'Public tables without RLS: %', tables_without_rls;
  end if;

  select string_agg(
    format('%I.%I:%s', namespace.nspname, relation.relname, command.name),
    ', '
  )
  into missing_crud_policies
  from pg_class as relation
  join pg_namespace as namespace on namespace.oid = relation.relnamespace
  cross join (
    values ('r', 'select'), ('a', 'insert'), ('w', 'update'), ('d', 'delete')
  ) as command(code, name)
  where namespace.nspname = 'public'
    and relation.relkind in ('r', 'p')
    and relation.relrowsecurity
    and not exists (
      select 1
      from pg_policy as policy
      where policy.polrelid = relation.oid
        and policy.polcmd = command.code
    );

  if missing_crud_policies is not null then
    raise exception 'Missing CRUD RLS policies: %', missing_crud_policies;
  end if;
end
$$;
