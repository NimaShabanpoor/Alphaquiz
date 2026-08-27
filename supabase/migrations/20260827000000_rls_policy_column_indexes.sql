-- Index the foreign-key columns used by ownership RLS policies.
create index if not exists answers_question_id_idx
  on public.answers ("questionId");

create index if not exists topics_category_id_idx
  on public.topics ("categoryId");

create index if not exists exam_publications_quiz_id_idx
  on public.exam_publications ("quizId");

create index if not exists exam_instances_publication_id_idx
  on public.exam_instances ("publicationId");
