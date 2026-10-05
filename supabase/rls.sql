-- HaboSavey (Supabase only): run AFTER drizzle migrations and supabase/triggers.sql.
-- Idempotent. The app's API routes use a server DB connection and do their own checks;
-- RLS is defence-in-depth for anything that talks to Supabase with the anon key.

-- 1. users.id ↔ auth.users.id, plus a profile row created on signup.
do $$ begin
  alter table public.users add constraint users_auth_fk
    foreign key (id) references auth.users(id) on delete cascade;
exception when duplicate_object then null; end $$;

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name)
  values (new.id, new.email, coalesce(split_part(new.email, '@', 1), 'resident'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- (Winner FK + vote-count trigger live in supabase/triggers.sql; run that first.)

-- 4. Row Level Security
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = auth.uid() and role in ('staff', 'admin'));
$$;

alter table public.users            enable row level security;
alter table public.places           enable row level security;
alter table public.challenges       enable row level security;
alter table public.proposals        enable row level security;
alter table public.generation_jobs  enable row level security;
alter table public.votes            enable row level security;
alter table public.comments         enable row level security;
alter table public.surveys          enable row level security;
alter table public.survey_questions enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_answers   enable row level security;
alter table public.reports          enable row level security;
alter table public.audit_log        enable row level security;
alter table public.qr_codes         enable row level security;
alter table public.qr_redemptions   enable row level security;

drop policy if exists users_self on public.users;
create policy users_self on public.users for select using (id = auth.uid() or public.is_staff());

drop policy if exists places_read on public.places;
create policy places_read on public.places for select using (true);

drop policy if exists challenges_read on public.challenges;
create policy challenges_read on public.challenges for select using (status <> 'draft' or public.is_staff());

drop policy if exists proposals_read on public.proposals;
create policy proposals_read on public.proposals for select
  using (status = 'approved' or author_id = auth.uid() or public.is_staff());

drop policy if exists jobs_own on public.generation_jobs;
create policy jobs_own on public.generation_jobs for select using (user_id = auth.uid());

drop policy if exists votes_own on public.votes;
create policy votes_own on public.votes for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select using (status = 'approved' or user_id = auth.uid() or public.is_staff());

drop policy if exists surveys_read on public.surveys;
create policy surveys_read on public.surveys for select using (status <> 'draft' or public.is_staff());

drop policy if exists questions_read on public.survey_questions;
create policy questions_read on public.survey_questions for select using (
  exists (select 1 from public.surveys s where s.id = survey_id and (s.status <> 'draft' or public.is_staff())));

drop policy if exists responses_own on public.survey_responses;
create policy responses_own on public.survey_responses for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists answers_staff on public.survey_answers;
create policy answers_staff on public.survey_answers for select using (public.is_staff());

drop policy if exists reports_staff on public.reports;
create policy reports_staff on public.reports for select using (public.is_staff());

drop policy if exists audit_staff on public.audit_log;
create policy audit_staff on public.audit_log for select using (public.is_staff());
-- No insert/update/delete policies: all writes go through the Next.js API (server connection).
