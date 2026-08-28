-- Durable, privacy-preserving API rate limits for serverless deployments
begin;

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

commit;
