create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  country_code text,
  fitness_goal text,
  preferred_units text not null default 'metric' check (preferred_units in ('metric', 'imperial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  eaten_at timestamptz not null default now(),
  title text not null,
  calories numeric(8,2) not null default 0 check (calories >= 0),
  protein_g numeric(8,2) not null default 0 check (protein_g >= 0),
  carbohydrates_g numeric(8,2) not null default 0 check (carbohydrates_g >= 0),
  fats_g numeric(8,2) not null default 0 check (fats_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.food_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  quantity numeric(10,2),
  unit text,
  calories numeric(8,2) not null default 0 check (calories >= 0),
  protein_g numeric(8,2) not null default 0 check (protein_g >= 0),
  carbohydrates_g numeric(8,2) not null default 0 check (carbohydrates_g >= 0),
  fats_g numeric(8,2) not null default 0 check (fats_g >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  goal text,
  location text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  status text not null default 'planned' check (status in ('planned', 'active', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  target_muscles text[] not null default '{}',
  instructions text,
  equipment text,
  sets integer check (sets is null or sets > 0),
  repetitions integer check (repetitions is null or repetitions > 0),
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  completed_sets jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(7,2) not null check (weight_kg >= 25 and weight_kg <= 350),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  calorie_target numeric(8,2) check (calorie_target is null or calorie_target >= 0),
  protein_target_g numeric(8,2) check (protein_target_g is null or protein_target_g >= 0),
  carbohydrates_target_g numeric(8,2) check (carbohydrates_target_g is null or carbohydrates_target_g >= 0),
  fats_target_g numeric(8,2) check (fats_target_g is null or fats_target_g >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null,
  workout_count integer not null default 0 check (workout_count >= 0),
  calories_burned numeric(9,2) not null default 0 check (calories_burned >= 0),
  steps integer check (steps is null or steps >= 0),
  active_minutes integer check (active_minutes is null or active_minutes >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  measurement_units text not null default 'metric' check (measurement_units in ('metric', 'imperial')),
  timezone text not null default 'UTC',
  notifications_enabled boolean not null default true,
  design_preview_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create index if not exists meals_user_eaten_idx on public.meals(user_id, eaten_at desc);
create index if not exists food_items_user_created_idx on public.food_items(user_id, created_at desc);
create index if not exists workouts_user_started_idx on public.workouts(user_id, started_at desc);
create index if not exists workout_exercises_user_created_idx on public.workout_exercises(user_id, created_at desc);
create index if not exists weight_logs_user_recorded_idx on public.weight_logs(user_id, recorded_at desc);
create index if not exists daily_activity_user_date_idx on public.daily_activity(user_id, activity_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists meals_set_updated_at on public.meals;
create trigger meals_set_updated_at before update on public.meals for each row execute function public.set_updated_at();
drop trigger if exists workouts_set_updated_at on public.workouts;
create trigger workouts_set_updated_at before update on public.workouts for each row execute function public.set_updated_at();
drop trigger if exists nutrition_goals_set_updated_at on public.nutrition_goals;
create trigger nutrition_goals_set_updated_at before update on public.nutrition_goals for each row execute function public.set_updated_at();
drop trigger if exists daily_activity_set_updated_at on public.daily_activity;
create trigger daily_activity_set_updated_at before update on public.daily_activity for each row execute function public.set_updated_at();
drop trigger if exists user_settings_set_updated_at on public.user_settings;
create trigger user_settings_set_updated_at before update on public.user_settings for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name')) on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.food_items enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.weight_logs enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.daily_activity enable row level security;
alter table public.user_settings enable row level security;

-- Every policy is scoped to the authenticated Supabase user. The service role bypasses RLS only for server maintenance.
drop policy if exists profiles_owner_select on public.profiles;
create policy profiles_owner_select on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_owner_insert on public.profiles;
create policy profiles_owner_insert on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_owner_delete on public.profiles;
create policy profiles_owner_delete on public.profiles for delete to authenticated using (id = auth.uid());

-- Direct user-owned tables.
do $$ declare tbl text; begin foreach tbl in array array['meals','workouts','weight_logs','nutrition_goals','daily_activity'] loop execute format('drop policy if exists %I on public.%I', tbl || '_owner_all', tbl); execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', tbl || '_owner_all', tbl); end loop; end $$;

drop policy if exists user_settings_owner_all on public.user_settings;
create policy user_settings_owner_all on public.user_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists food_items_owner_all on public.food_items;
create policy food_items_owner_all on public.food_items for all to authenticated using (user_id = auth.uid() and exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid())) with check (user_id = auth.uid() and exists (select 1 from public.meals m where m.id = meal_id and m.user_id = auth.uid()));

drop policy if exists workout_exercises_owner_all on public.workout_exercises;
create policy workout_exercises_owner_all on public.workout_exercises for all to authenticated using (user_id = auth.uid() and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())) with check (user_id = auth.uid() and exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

-- Private progress-photo storage bucket and owner-only object access for the future Supabase-backed photo adapter.
insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false) on conflict (id) do update set public = false;
drop policy if exists progress_photos_owner_select on storage.objects;
create policy progress_photos_owner_select on storage.objects for select to authenticated using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists progress_photos_owner_insert on storage.objects;
create policy progress_photos_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists progress_photos_owner_update on storage.objects;
create policy progress_photos_owner_update on storage.objects for update to authenticated using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists progress_photos_owner_delete on storage.objects;
create policy progress_photos_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'progress-photos' and (storage.foldername(name))[1] = auth.uid()::text);
