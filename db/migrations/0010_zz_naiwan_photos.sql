-- Naiwan A/B poll now uses real renders (scripts/seed-assets): A wooden deck, B stone paving.
update public.polls set
  option_a_label_ja = '木のデッキと木の屋根', option_a_label_en = 'Wooden deck and timber pergola',
  option_b_label_ja = '石畳とスチールの屋根', option_b_label_en = 'Stone paving and steel pergola'
where id = '00000000-0000-4000-c000-000000000001';
