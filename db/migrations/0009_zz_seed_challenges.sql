-- Two more open A/B challenges for the homepage cards (images: scripts/seed-images.mjs → poll-images/seed/*). Idempotent.
insert into public.polls (id, slug, featured, title_ja, title_en, question_ja, question_en, description_ja, description_en,
  option_a_image_path, option_a_label_ja, option_a_label_en, option_b_image_path, option_b_label_ja, option_b_label_en,
  status, results_visibility) values
  ('00000000-0000-4000-c000-000000000002', 'park', false, '緑が増えると、笑顔も増える。', 'A little more green, a lot more life',
   'まちの公園、あなたはどちらがいいですか？', 'Which neighbourhood park do you prefer?',
   '子どもから大人まで、誰もがほっとできる公園を考えましょう。', 'Imagine a welcoming green space where every generation feels at home.',
   'seed/park-a.jpg', '今の空き地のまま', 'Keep the empty lot', 'seed/park-b.jpg', '木と遊具とベンチのある公園', 'A park with trees, play and benches',
   'open', 'after_vote'),
  ('00000000-0000-4000-c000-000000000003', 'street', false, '人と人が、つながる通りへ。', 'A street that brings us together',
   '中心市街地の通り、あなたはどちらがいいですか？', 'Which town-centre street do you prefer?',
   '歩きやすく、親しみやすい。そんなまちの通りを考えましょう。', 'Share your idea for a friendlier, more walkable neighbourhood.',
   'seed/street-a.jpg', '今の車中心の道路', 'Today''s car-first road', 'seed/street-b.jpg', '歩いて楽しい木陰の通り', 'A shady street made for walking',
   'open', 'after_vote')
on conflict (id) do nothing;

insert into public.qr_codes (id, code, kind, target_type, target_id, label) values
  ('00000000-0000-4000-b000-000000000006', 'parkab', 'link', 'poll', '00000000-0000-4000-c000-000000000002', '公園 A/B ポスター / Park A/B poster'),
  ('00000000-0000-4000-b000-000000000007', 'streetab', 'link', 'poll', '00000000-0000-4000-c000-000000000003', '通り A/B ポスター / Street A/B poster')
on conflict (id) do nothing;
