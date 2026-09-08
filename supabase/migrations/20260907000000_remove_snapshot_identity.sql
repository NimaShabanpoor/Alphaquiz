begin;

-- Strip legacy identity fields from the JSON itself, not just its TS type.
update public.exam_instances
set snapshot = snapshot - 'studentKey' - 'name' - 'email';

alter table public.exam_instances drop column "studentKey";
-- Reject old writers instead of silently restoring identity copies.
alter table public.exam_instances add constraint exam_instances_no_identity
  check (jsonb_typeof(snapshot) = 'object'
    and not (snapshot ?| array['studentKey', 'name', 'email']));

notify pgrst, 'reload schema';
commit;
