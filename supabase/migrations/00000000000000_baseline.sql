-- AlphaQuiz baseline generated from the verified Dev database.
-- Application schemas only; no data and no Supabase platform event triggers.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Supabase grants new public objects to API roles by default. Keep future
-- application objects closed to anonymous requests unless a migration opts in.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;
alter default privileges in schema public revoke all on functions from public;

create table "private"."request_rate_limits" (
  "key_hash" text not null,
  "request_count" integer not null,
  "reset_at" timestamp with time zone not null,
  "updated_at" timestamp with time zone default now() not null
);

create table "public"."answers" (
  "id" text not null,
  "questionId" text not null,
  "text" text default ''::text not null,
  "correct" boolean default false not null,
  "position" integer default 0 not null
);

create table "public"."categories" (
  "id" text not null,
  "name" text not null,
  "color" text default '#6f8785'::text not null,
  "user_id" uuid not null
);

create table "public"."exam_attempts" (
  "id" text not null,
  "publicationId" text not null,
  "name" text not null,
  "email" text not null,
  "status" text default 'in-progress'::text not null,
  "startedAt" timestamp with time zone default now() not null,
  "submittedAt" timestamp with time zone,
  "currentQuestion" integer default 0 not null,
  "responses" jsonb default '{}'::jsonb not null,
  "score" integer default 0 not null,
  "possible" integer default 0 not null,
  "percentage" integer default 0 not null,
  "passed" boolean default false not null,
  "topicResults" jsonb default '[]'::jsonb not null,
  "violationCount" integer default 0 not null,
  "resultEmailStatus" text default 'pending'::text not null,
  "accessTokenHash" text,
  "updatedAt" timestamp with time zone default now() not null
);

create table "public"."exam_events" (
  "id" text not null,
  "publicationId" text not null,
  "attemptId" text not null,
  "type" text not null,
  "message" text not null,
  "createdAt" timestamp with time zone default now() not null
);

create table "public"."exam_instances" (
  "id" text not null,
  "attemptId" text not null,
  "publicationId" text not null,
  "quizId" text not null,
  "studentKey" text not null,
  "questionOrder" jsonb not null,
  "topicOrder" jsonb not null,
  "answerOrderByQuestionId" jsonb not null,
  "snapshot" jsonb not null,
  "seed" text not null,
  "generatedAt" timestamp with time zone default now() not null,
  "previousAttemptId" text
);

create table "public"."exam_publications" (
  "id" text not null,
  "quizId" text not null,
  "slug" text not null,
  "mode" text default 'closed'::text not null,
  "timeLimit" integer default 45 not null,
  "maxViolations" integer default 2 not null,
  "active" boolean default true not null,
  "sendResults" boolean default true not null,
  "createdAt" timestamp with time zone default now() not null,
  "availableFrom" timestamp with time zone,
  "availableUntil" timestamp with time zone,
  "randomization" jsonb default '{"retryMode": "regenerate", "useTopics": true, "shuffleAnswers": false, "lockedQuestionIds": [], "questionOrderMode": "fixed", "requiredQuestionIds": [], "questionCountByTopic": {}}'::jsonb not null
);

create table "public"."exports" (
  "id" text not null,
  "quizId" text not null,
  "format" text not null,
  "fileName" text not null,
  "createdAt" timestamp with time zone default now() not null,
  "user_id" uuid not null
);

create table "public"."questions" (
  "id" text not null,
  "title" text not null,
  "description" text default ''::text not null,
  "type" text not null,
  "categoryId" text,
  "points" integer default 1 not null,
  "shuffle" boolean default true not null,
  "topicId" text,
  "image" jsonb,
  "user_id" uuid not null
);

create table "public"."quiz_questions" (
  "quizId" text not null,
  "questionId" text not null,
  "position" integer default 0 not null
);

create table "public"."quizzes" (
  "id" text not null,
  "title" text not null,
  "description" text default ''::text not null,
  "categoryId" text,
  "status" text default 'draft'::text not null,
  "updatedAt" timestamp with time zone default now() not null,
  "passPercentage" integer default 70 not null,
  "scoringMode" text default 'combined'::text not null,
  "topicPassPercentages" jsonb default '{}'::jsonb not null,
  "hiddenTopicIds" jsonb default '[]'::jsonb not null,
  "user_id" uuid not null
);

create table "public"."topics" (
  "id" text not null,
  "categoryId" text not null,
  "name" text not null
);

alter table "private"."request_rate_limits"
  add constraint "request_rate_limits_pkey" PRIMARY KEY (key_hash);

alter table "public"."answers"
  add constraint "answers_pkey" PRIMARY KEY (id);

alter table "public"."categories"
  add constraint "categories_pkey" PRIMARY KEY (id);

alter table "public"."exam_attempts"
  add constraint "exam_attempts_pkey" PRIMARY KEY (id);

alter table "public"."exam_events"
  add constraint "exam_events_pkey" PRIMARY KEY (id);

alter table "public"."exam_instances"
  add constraint "exam_instances_attemptId_key" UNIQUE ("attemptId");

alter table "public"."exam_instances"
  add constraint "exam_instances_pkey" PRIMARY KEY (id);

alter table "public"."exam_publications"
  add constraint "exam_publications_pkey" PRIMARY KEY (id);

alter table "public"."exam_publications"
  add constraint "exam_publications_slug_key" UNIQUE (slug);

alter table "public"."exports"
  add constraint "exports_pkey" PRIMARY KEY (id);

alter table "public"."questions"
  add constraint "questions_pkey" PRIMARY KEY (id);

alter table "public"."quiz_questions"
  add constraint "quiz_questions_pkey" PRIMARY KEY ("quizId", "questionId");

alter table "public"."quizzes"
  add constraint "quizzes_pkey" PRIMARY KEY (id);

alter table "public"."topics"
  add constraint "topics_pkey" PRIMARY KEY (id);

alter table "public"."answers"
  add constraint "answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES questions(id) ON DELETE CASCADE;

alter table "public"."categories"
  add constraint "categories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table "public"."exam_attempts"
  add constraint "exam_attempts_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES exam_publications(id) ON DELETE CASCADE;

alter table "public"."exam_events"
  add constraint "exam_events_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES exam_attempts(id) ON DELETE CASCADE;

alter table "public"."exam_events"
  add constraint "exam_events_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES exam_publications(id) ON DELETE CASCADE;

alter table "public"."exam_instances"
  add constraint "exam_instances_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES exam_attempts(id) ON DELETE CASCADE;

alter table "public"."exam_instances"
  add constraint "exam_instances_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES exam_publications(id) ON DELETE CASCADE;

alter table "public"."exam_publications"
  add constraint "exam_publications_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES quizzes(id) ON DELETE CASCADE;

alter table "public"."exports"
  add constraint "exports_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES quizzes(id) ON DELETE CASCADE;

alter table "public"."exports"
  add constraint "exports_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table "public"."questions"
  add constraint "questions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES categories(id);

alter table "public"."questions"
  add constraint "questions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES topics(id);

alter table "public"."questions"
  add constraint "questions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table "public"."quiz_questions"
  add constraint "quiz_questions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES questions(id) ON DELETE CASCADE;

alter table "public"."quiz_questions"
  add constraint "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES quizzes(id) ON DELETE CASCADE;

alter table "public"."quizzes"
  add constraint "quizzes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES categories(id);

alter table "public"."quizzes"
  add constraint "quizzes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);

alter table "public"."topics"
  add constraint "topics_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES categories(id) ON DELETE CASCADE;

CREATE INDEX request_rate_limits_reset_at_idx ON private.request_rate_limits USING btree (reset_at);

CREATE INDEX answers_question_id_idx ON public.answers USING btree ("questionId");

CREATE INDEX categories_user_id_idx ON public.categories USING btree (user_id);

CREATE UNIQUE INDEX exam_attempts_one_active_per_email ON public.exam_attempts USING btree ("publicationId", lower(email)) WHERE (status <> 'reset'::text);

CREATE INDEX exam_attempts_publication_started_idx ON public.exam_attempts USING btree ("publicationId", "startedAt" DESC);

CREATE INDEX exam_events_attempt_created_idx ON public.exam_events USING btree ("attemptId", "createdAt" DESC);

CREATE INDEX exam_events_publication_created_idx ON public.exam_events USING btree ("publicationId", "createdAt" DESC);

CREATE INDEX exam_instances_publication_id_idx ON public.exam_instances USING btree ("publicationId");

CREATE INDEX exam_publications_quiz_id_idx ON public.exam_publications USING btree ("quizId");

CREATE INDEX exports_user_id_idx ON public.exports USING btree (user_id);

CREATE INDEX questions_user_id_idx ON public.questions USING btree (user_id);

CREATE INDEX quizzes_user_id_idx ON public.quizzes USING btree (user_id);

CREATE INDEX topics_category_id_idx ON public.topics USING btree ("categoryId");

alter table "public"."answers" enable row level security;
alter table "public"."categories" enable row level security;
alter table "public"."exam_attempts" enable row level security;
alter table "public"."exam_events" enable row level security;
alter table "public"."exam_instances" enable row level security;
alter table "public"."exam_publications" enable row level security;
alter table "public"."exports" enable row level security;
alter table "public"."questions" enable row level security;
alter table "public"."quiz_questions" enable row level security;
alter table "public"."quizzes" enable row level security;
alter table "public"."topics" enable row level security;

create policy "answers_delete_own"
  on "public"."answers"
  as permissive
  for delete
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM questions question
  WHERE ((question.id = answers."questionId") AND (question.user_id = ( SELECT auth.uid() AS uid))))));

create policy "answers_insert_own"
  on "public"."answers"
  as permissive
  for insert
  to "authenticated"
  with check ((EXISTS ( SELECT 1
   FROM questions question
  WHERE ((question.id = answers."questionId") AND (question.user_id = ( SELECT auth.uid() AS uid))))));

create policy "answers_select_own"
  on "public"."answers"
  as permissive
  for select
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM questions question
  WHERE ((question.id = answers."questionId") AND (question.user_id = ( SELECT auth.uid() AS uid))))));

create policy "answers_update_own"
  on "public"."answers"
  as permissive
  for update
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM questions question
  WHERE ((question.id = answers."questionId") AND (question.user_id = ( SELECT auth.uid() AS uid))))))
  with check ((EXISTS ( SELECT 1
   FROM questions question
  WHERE ((question.id = answers."questionId") AND (question.user_id = ( SELECT auth.uid() AS uid))))));

create policy "categories_delete_own"
  on "public"."categories"
  as permissive
  for delete
  to "authenticated"
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "categories_insert_own"
  on "public"."categories"
  as permissive
  for insert
  to "authenticated"
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "categories_select_own"
  on "public"."categories"
  as permissive
  for select
  to "authenticated"
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "categories_update_own"
  on "public"."categories"
  as permissive
  for update
  to "authenticated"
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "exam_attempts_delete_own"
  on "public"."exam_attempts"
  as permissive
  for delete
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_attempts."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_attempts_insert_own"
  on "public"."exam_attempts"
  as permissive
  for insert
  to "authenticated"
  with check ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_attempts."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_attempts_select_own"
  on "public"."exam_attempts"
  as permissive
  for select
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_attempts."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_attempts_update_own"
  on "public"."exam_attempts"
  as permissive
  for update
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_attempts."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))))
  with check ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_attempts."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_events_delete_own"
  on "public"."exam_events"
  as permissive
  for delete
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_events."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_events_insert_own"
  on "public"."exam_events"
  as permissive
  for insert
  to "authenticated"
  with check ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_events."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_events_select_own"
  on "public"."exam_events"
  as permissive
  for select
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_events."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_events_update_own"
  on "public"."exam_events"
  as permissive
  for update
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_events."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))))
  with check ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_events."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_instances_delete_own"
  on "public"."exam_instances"
  as permissive
  for delete
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_instances."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_instances_insert_own"
  on "public"."exam_instances"
  as permissive
  for insert
  to "authenticated"
  with check ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_instances."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_instances_select_own"
  on "public"."exam_instances"
  as permissive
  for select
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_instances."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_instances_update_own"
  on "public"."exam_instances"
  as permissive
  for update
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_instances."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))))
  with check ((EXISTS ( SELECT 1
   FROM (exam_publications publication
     JOIN quizzes quiz ON ((quiz.id = publication."quizId")))
  WHERE ((publication.id = exam_instances."publicationId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_publications_delete_own"
  on "public"."exam_publications"
  as permissive
  for delete
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM quizzes quiz
  WHERE ((quiz.id = exam_publications."quizId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_publications_insert_own"
  on "public"."exam_publications"
  as permissive
  for insert
  to "authenticated"
  with check ((EXISTS ( SELECT 1
   FROM quizzes quiz
  WHERE ((quiz.id = exam_publications."quizId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_publications_select_own"
  on "public"."exam_publications"
  as permissive
  for select
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM quizzes quiz
  WHERE ((quiz.id = exam_publications."quizId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exam_publications_update_own"
  on "public"."exam_publications"
  as permissive
  for update
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM quizzes quiz
  WHERE ((quiz.id = exam_publications."quizId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))))
  with check ((EXISTS ( SELECT 1
   FROM quizzes quiz
  WHERE ((quiz.id = exam_publications."quizId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))));

create policy "exports_delete_own"
  on "public"."exports"
  as permissive
  for delete
  to "authenticated"
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "exports_insert_own"
  on "public"."exports"
  as permissive
  for insert
  to "authenticated"
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "exports_select_own"
  on "public"."exports"
  as permissive
  for select
  to "authenticated"
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "exports_update_own"
  on "public"."exports"
  as permissive
  for update
  to "authenticated"
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "questions_delete_own"
  on "public"."questions"
  as permissive
  for delete
  to "authenticated"
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "questions_insert_own"
  on "public"."questions"
  as permissive
  for insert
  to "authenticated"
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "questions_select_own"
  on "public"."questions"
  as permissive
  for select
  to "authenticated"
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "questions_update_own"
  on "public"."questions"
  as permissive
  for update
  to "authenticated"
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "quiz_questions_delete_own"
  on "public"."quiz_questions"
  as permissive
  for delete
  to "authenticated"
  using (((EXISTS ( SELECT 1
   FROM quizzes quiz
  WHERE ((quiz.id = quiz_questions."quizId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM questions question
  WHERE ((question.id = quiz_questions."questionId") AND (question.user_id = ( SELECT auth.uid() AS uid)))))));

create policy "quiz_questions_insert_own"
  on "public"."quiz_questions"
  as permissive
  for insert
  to "authenticated"
  with check (((EXISTS ( SELECT 1
   FROM quizzes quiz
  WHERE ((quiz.id = quiz_questions."quizId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM questions question
  WHERE ((question.id = quiz_questions."questionId") AND (question.user_id = ( SELECT auth.uid() AS uid)))))));

create policy "quiz_questions_select_own"
  on "public"."quiz_questions"
  as permissive
  for select
  to "authenticated"
  using (((EXISTS ( SELECT 1
   FROM quizzes quiz
  WHERE ((quiz.id = quiz_questions."quizId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM questions question
  WHERE ((question.id = quiz_questions."questionId") AND (question.user_id = ( SELECT auth.uid() AS uid)))))));

create policy "quiz_questions_update_own"
  on "public"."quiz_questions"
  as permissive
  for update
  to "authenticated"
  using (((EXISTS ( SELECT 1
   FROM quizzes quiz
  WHERE ((quiz.id = quiz_questions."quizId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM questions question
  WHERE ((question.id = quiz_questions."questionId") AND (question.user_id = ( SELECT auth.uid() AS uid)))))))
  with check (((EXISTS ( SELECT 1
   FROM quizzes quiz
  WHERE ((quiz.id = quiz_questions."quizId") AND (quiz.user_id = ( SELECT auth.uid() AS uid))))) AND (EXISTS ( SELECT 1
   FROM questions question
  WHERE ((question.id = quiz_questions."questionId") AND (question.user_id = ( SELECT auth.uid() AS uid)))))));

create policy "quizzes_delete_own"
  on "public"."quizzes"
  as permissive
  for delete
  to "authenticated"
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "quizzes_insert_own"
  on "public"."quizzes"
  as permissive
  for insert
  to "authenticated"
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "quizzes_select_own"
  on "public"."quizzes"
  as permissive
  for select
  to "authenticated"
  using ((( SELECT auth.uid() AS uid) = user_id));

create policy "quizzes_update_own"
  on "public"."quizzes"
  as permissive
  for update
  to "authenticated"
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "topics_delete_own"
  on "public"."topics"
  as permissive
  for delete
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM categories category
  WHERE ((category.id = topics."categoryId") AND (category.user_id = ( SELECT auth.uid() AS uid))))));

create policy "topics_insert_own"
  on "public"."topics"
  as permissive
  for insert
  to "authenticated"
  with check ((EXISTS ( SELECT 1
   FROM categories category
  WHERE ((category.id = topics."categoryId") AND (category.user_id = ( SELECT auth.uid() AS uid))))));

create policy "topics_select_own"
  on "public"."topics"
  as permissive
  for select
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM categories category
  WHERE ((category.id = topics."categoryId") AND (category.user_id = ( SELECT auth.uid() AS uid))))));

create policy "topics_update_own"
  on "public"."topics"
  as permissive
  for update
  to "authenticated"
  using ((EXISTS ( SELECT 1
   FROM categories category
  WHERE ((category.id = topics."categoryId") AND (category.user_id = ( SELECT auth.uid() AS uid))))))
  with check ((EXISTS ( SELECT 1
   FROM categories category
  WHERE ((category.id = topics."categoryId") AND (category.user_id = ( SELECT auth.uid() AS uid))))));

CREATE OR REPLACE FUNCTION public.consume_rate_limit(p_key_hash text, p_limit integer, p_window_seconds integer)
 RETURNS TABLE(allowed boolean, retry_after integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'private', 'pg_temp'
AS $function$
declare
  current_count integer;
  current_reset timestamptz;
  current_timestamp_value timestamptz := clock_timestamp();
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
    where reset_at < current_timestamp_value - interval '1 day'
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
    current_timestamp_value + make_interval(secs => p_window_seconds),
    current_timestamp_value
  )
  on conflict (key_hash) do update
  set
    request_count = case
      when rate_limit.reset_at <= current_timestamp_value then 1
      else least(rate_limit.request_count + 1, p_limit + 1)
    end,
    reset_at = case
      when rate_limit.reset_at <= current_timestamp_value
        then current_timestamp_value + make_interval(secs => p_window_seconds)
      else rate_limit.reset_at
    end,
    updated_at = current_timestamp_value
  returning request_count, reset_at
  into current_count, current_reset;

  allowed := current_count <= p_limit;
  retry_after := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from current_reset - current_timestamp_value))::integer)
  end;
  return next;
end;
$function$;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all tables in schema private from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;

grant delete, insert, select, update on table "public"."answers" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."answers" to "service_role";
grant delete, insert, select, update on table "public"."categories" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."categories" to "service_role";
grant delete, insert, select, update on table "public"."exam_attempts" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."exam_attempts" to "service_role";
grant delete, insert, select, update on table "public"."exam_events" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."exam_events" to "service_role";
grant delete, insert, select, update on table "public"."exam_instances" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."exam_instances" to "service_role";
grant delete, insert, select, update on table "public"."exam_publications" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."exam_publications" to "service_role";
grant delete, insert, select, update on table "public"."exports" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."exports" to "service_role";
grant delete, insert, select, update on table "public"."questions" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."questions" to "service_role";
grant delete, insert, select, update on table "public"."quiz_questions" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."quiz_questions" to "service_role";
grant delete, insert, select, update on table "public"."quizzes" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."quizzes" to "service_role";
grant delete, insert, select, update on table "public"."topics" to "authenticated";
grant delete, insert, references, select, trigger, truncate, update on table "public"."topics" to "service_role";

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer) to "anon";
grant execute on function public.consume_rate_limit(text, integer, integer) to "authenticated";

notify pgrst, 'reload schema';

commit;
