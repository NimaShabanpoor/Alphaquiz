begin;

create or replace function public.consume_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path to 'private', 'pg_temp'
as $function$
declare
  current_count integer;
  current_reset timestamptz;
  current_timestamp_value timestamptz := clock_timestamp();
  maximum_active_buckets constant integer := 10000;
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

  if not exists (
    select 1
    from private.request_rate_limits
    where key_hash = p_key_hash
  ) then
    perform pg_catalog.pg_advisory_xact_lock(1613565253);

    if not exists (
      select 1
      from private.request_rate_limits
      where key_hash = p_key_hash
    ) and (
        select count(*)
        from private.request_rate_limits
        where reset_at > current_timestamp_value
      ) >= maximum_active_buckets then
      raise exception 'rate limit capacity exceeded';
    end if;
  end if;

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
    else greatest(
      1,
      ceil(extract(epoch from current_reset - current_timestamp_value))::integer
    )
  end;
  return next;
end;
$function$;

revoke all on function public.consume_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer)
  to service_role;

notify pgrst, 'reload schema';

commit;
