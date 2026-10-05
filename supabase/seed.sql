-- Demo data for Kesennuma. Coordinates are approximate, so staff should check them on the map.
-- Run after rls.sql. Idempotent (fixed UUIDs).
insert into public.places (id, name_ja, name_en, lat, lng, district) values
  ('00000000-0000-4000-8000-000000000001', '気仙沼内湾（ないわん）',         'Kesennuma Inner Bay (Naiwan)',      38.9062, 141.5730, '内湾'),
  ('00000000-0000-4000-8000-000000000002', '気仙沼市魚市場',                 'Kesennuma Fish Market',             38.9040, 141.5795, '魚市場前'),
  ('00000000-0000-4000-8000-000000000003', '気仙沼駅前',                     'Kesennuma Station Square',          38.9105, 141.5620, '駅前'),
  ('00000000-0000-4000-8000-000000000004', '安波山',                         'Mt. Anba Lookout',                  38.9140, 141.5785, '内湾'),
  ('00000000-0000-4000-8000-000000000005', '気仙沼大島大橋',                 'Kesennuma-Oshima Bridge',           38.8735, 141.6020, '大島'),
  ('00000000-0000-4000-8000-000000000006', '岩井崎',                         'Iwaisaki Cape',                     38.8215, 141.6045, '階上'),
  ('00000000-0000-4000-8000-000000000007', '唐桑半島 巨釜',                  'Karakuwa Peninsula – Okama',        38.9190, 141.6930, '唐桑'),
  ('00000000-0000-4000-8000-000000000008', '東日本大震災遺構・伝承館',       'Great East Japan Earthquake Memorial Museum', 38.8445, 141.5960, '波路上'),
  ('00000000-0000-4000-8000-000000000009', '鹿折地区 港町',                  'Shishiori Harbour District',        38.9195, 141.5755, '鹿折')
on conflict (id) do nothing;

insert into public.challenges (id, place_id, title_ja, title_en, description_ja, description_en, status,
  submit_opens_at, voting_opens_at, closes_at, results_visibility) values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000001',
   '2030年の内湾をデザインしよう', 'Design the Naiwan waterfront for 2030',
   '内湾の写真を撮って、AIで「もっと良く」してみましょう。いちばん良いアイデアを町のみんなで選びます。',
   'Photograph the inner bay, make it better with AI, and let the town choose the best idea.',
   'open', now(), now() + interval '21 days', now() + interval '35 days', 'after_vote')
on conflict (id) do nothing;

insert into public.surveys (id, title_ja, title_en, description_ja, description_en, status, anonymous) values
  ('00000000-0000-4000-a000-000000000001', '港まわりの暮らしアンケート', 'Life around the harbour survey',
   '港周辺の使いやすさについて教えてください（約2分）。', 'Tell us how the harbour area works for you (about 2 min).',
   'open', true)
on conflict (id) do nothing;

insert into public.survey_questions (id, survey_id, position, type, label_ja, label_en, options, required) values
  ('00000000-0000-4000-a100-000000000001', '00000000-0000-4000-a000-000000000001', 1, 'single',
   '港周辺にどのくらい行きますか？', 'How often do you visit the harbour area?',
   '[{"value":"daily","labelJa":"毎日","labelEn":"Daily"},{"value":"weekly","labelJa":"週に1回以上","labelEn":"Weekly"},{"value":"monthly","labelJa":"月に1回以上","labelEn":"Monthly"},{"value":"rarely","labelJa":"ほとんど行かない","labelEn":"Rarely"}]', true),
  ('00000000-0000-4000-a100-000000000002', '00000000-0000-4000-a000-000000000001', 2, 'multi',
   '何があればもっと行きたくなりますか？', 'What would make you visit more?',
   '[{"value":"seating","labelJa":"ベンチ・休憩所","labelEn":"Seating"},{"value":"greenery","labelJa":"緑・花","labelEn":"Greenery"},{"value":"food","labelJa":"食事・カフェ","labelEn":"Food & cafés"},{"value":"events","labelJa":"イベント","labelEn":"Events"},{"value":"access","labelJa":"バリアフリー","labelEn":"Accessibility"}]', true),
  ('00000000-0000-4000-a100-000000000003', '00000000-0000-4000-a000-000000000001', 3, 'rating',
   '今の港周辺の満足度は？（1〜5）', 'How satisfied are you with the harbour area today? (1–5)', '[]', true),
  ('00000000-0000-4000-a100-000000000004', '00000000-0000-4000-a000-000000000001', 4, 'text',
   'ご意見・アイデアを自由にどうぞ', 'Any other ideas or comments?', '[]', false)
on conflict (id) do nothing;

-- Demo QR codes (local URLs: /q/<code>)
insert into public.qr_codes (id, code, kind, target_type, target_id, label) values
  ('00000000-0000-4000-b000-000000000001', 'cityhall1', 'verify_local', null, null, '市役所 窓口（住民確認） / City hall desk (resident check)'),
  ('00000000-0000-4000-b000-000000000002', 'harbour7', 'link', 'survey', '00000000-0000-4000-a000-000000000001', '港アンケートのポスター / Harbour survey poster'),
  ('00000000-0000-4000-b000-000000000003', 'naiwan24', 'link', 'place', '00000000-0000-4000-8000-000000000001', '内湾の看板：写真を撮ろう / Naiwan sign: snap this place')
on conflict (id) do nothing;
