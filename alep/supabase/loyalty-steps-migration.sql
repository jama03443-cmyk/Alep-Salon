-- Store an editable list of loyalty program steps for the client page.
-- Run after loyalty-program-settings-migration.sql.

begin;

alter table public.site_settings
  add column if not exists loyalty_steps jsonb;

update public.site_settings
set loyalty_steps = jsonb_build_array(
  jsonb_build_object('id', 'reward', 'title', loyalty_reward_title, 'description', loyalty_reward_description, 'icon', 'scissors'),
  jsonb_build_object('id', 'birthday', 'title', loyalty_birthday_title, 'description', loyalty_birthday_description, 'icon', 'gift'),
  jsonb_build_object('id', 'referral', 'title', loyalty_referral_title, 'description', loyalty_referral_description, 'icon', 'friends'),
  jsonb_build_object('id', 'review', 'title', loyalty_review_title, 'description', loyalty_review_description, 'icon', 'star')
)
where loyalty_steps is null;

alter table public.site_settings
  alter column loyalty_steps set default '[]'::jsonb,
  alter column loyalty_steps set not null;

commit;
