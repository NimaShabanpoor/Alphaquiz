-- AlphaQuiz ownership and row-level security
--
-- Legacy installations used a single administrator without ownership columns.
-- Existing rows can therefore only be assigned safely when exactly one Auth
-- user exists. With multiple users the migration aborts instead of guessing.

begin;

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
        hint = 'Assign user_id explicitly to legacy rows before applying this migration.';
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

-- Fail the migration if any public table is left without RLS or without one
-- policy for every CRUD operation. This also protects future schema additions.
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

commit;
