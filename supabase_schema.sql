-- Таблица вакансий
create table public.jobs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  company text not null,
  city text not null,
  salary text,
  description text,
  user_id uuid references auth.users(id) on delete cascade
);

-- Настройка RLS (Row Level Security)
alter table public.jobs enable row level security;

-- Политика: любой может смотреть вакансии
create policy "Allow public read access" on public.jobs for select using (true);

-- Политика: только авторизованный создатель может удалять/менять свои вакансии
create policy "Allow individual delete access" on public.jobs for delete using (auth.uid() = user_id);
create policy "Allow individual update access" on public.jobs for update using (auth.uid() = user_id);
create policy "Allow authenticated insert" on public.jobs for insert with check (auth.role() = 'authenticated');
