-- HaboSavey: constraints/triggers drizzle can't express. Runs everywhere (local + Supabase), after migrations. Idempotent.

-- 1. Circular FK: challenges.winner_proposal_id → proposals.id
do $$ begin
  alter table public.challenges add constraint challenges_winner_fk
    foreign key (winner_proposal_id) references public.proposals(id) on delete set null;
exception when duplicate_object then null; end $$;

-- 2. Keep proposals.vote_count in sync with votes.
create or replace function public.sync_vote_count() returns trigger
language plpgsql as $$
begin
  if tg_op in ('DELETE', 'UPDATE') then
    update public.proposals set vote_count = vote_count - 1 where id = old.proposal_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.proposals set vote_count = vote_count + 1 where id = new.proposal_id;
  end if;
  return null;
end $$;

drop trigger if exists votes_sync_count on public.votes;
create trigger votes_sync_count after insert or delete or update of proposal_id on public.votes
  for each row execute function public.sync_vote_count();

