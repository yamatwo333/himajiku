-- ========================================
-- himajiku: availability取得をDB関数へ集約
-- ========================================

create or replace function public.get_scoped_availability_range(
  viewer_user_id uuid,
  target_group_id uuid,
  start_date date,
  end_date date
)
returns jsonb
language sql
stable
set search_path = public
as $$
  with access_scope as (
    select case
      when target_group_id is null then true
      else exists (
        select 1
        from public.group_members gm
        where gm.group_id = target_group_id
          and gm.user_id = viewer_user_id
      )
    end as allowed
  ),
  scoped_members as (
    select viewer_user_id as user_id
    from access_scope
    where allowed and target_group_id is null

    union all

    select gm.user_id
    from public.group_members gm
    cross join access_scope
    where access_scope.allowed
      and target_group_id is not null
      and gm.group_id = target_group_id
  ),
  availability_rows as (
    select
      a.id,
      a.user_id,
      a.date,
      a.time_slots,
      a.comment,
      p.display_name,
      p.avatar_url
    from public.availability a
    join scoped_members sm on sm.user_id = a.user_id
    left join public.profiles p on p.id = a.user_id
    where a.date between start_date and end_date
    order by a.date asc, a.user_id asc
  )
  select jsonb_build_object(
    'allowed',
    coalesce((select allowed from access_scope), false),
    'availabilities',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', availability_rows.id,
            'user_id', availability_rows.user_id,
            'date', availability_rows.date,
            'time_slots', availability_rows.time_slots,
            'comment', availability_rows.comment,
            'display_name', availability_rows.display_name,
            'avatar_url', availability_rows.avatar_url
          )
        )
        from availability_rows
      ),
      '[]'::jsonb
    )
  );
$$;
