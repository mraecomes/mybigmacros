create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  name text not null,
  profile_photo_url text,
  daily_calorie_goal integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users manage own profile"
  on profiles for all
  using (auth.uid() = id);
