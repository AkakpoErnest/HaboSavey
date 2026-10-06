# From demo to a public website everyone in Kesennuma knows

Status today: a working demo at https://citizen-sentiment-kesennuma.netlify.app (anonymous A/B polls, points, Hoya Boya, live results).

## 1. Make it official (trust is what gets people to use it)
- [ ] **City partnership**: send `docs/city-application-hoyaboya.md` (Hoya Boya motion + official promotion). A "supported by Kesennuma City"
      line and the city's own QR posters will do more than any ad.
- [ ] **Own domain**: e.g. `kesennuma-voice.jp` or a city subdomain. Printed QR codes should never break.
- [ ] **Privacy policy + terms in Japanese** (APPI): what's stored (anonymous votes, device cookie, optional email), retention, contact.
- [ ] Turn off demo mode (`POINTS_OPEN_EARNING`) and decide how residents get verified (city hall QR codes).

## 2. Make it solid
- [ ] Paid Netlify plan or Vercel (no third-party badge, more function time) and a Neon paid tier with backups.
- [ ] Real email sign-in (Supabase or Neon Auth) for staff; keep anonymous voting for residents.
- [ ] Real AI image generation (OpenAI or Gemini key) for "propose an idea".
- [ ] Monitoring: uptime alert, error logs, weekly vote-count report for the city.
- [ ] Accessibility check with older residents (font size, contrast, one-hand use).

## 3. Make everyone know about it
- [ ] **QR flyers and posters** where people already are: city hall, the fish market, 海の市, PIER7, stations, schools, community centres.
- [ ] **Local media**: 三陸新報 (Sanriku Shimpo), 河北新報, local radio (ラヂオ気仙沼); a short press release with the first poll result.
- [ ] **LINE**: a 公式アカウント with a monthly "new poll" message (most residents use LINE).
- [ ] **Events**: a voting booth at 気仙沼みなとまつり and other festivals, with QR stands and points.
- [ ] **Schools and 公民館** (community centres): a 10-minute workshop ("take a photo, imagine your town").
- [ ] **Partners**: KesenMemento (the 3D game) for stamps and points; local shops could join later as point partners.
- [ ] **Show results back**: post every poll result publicly, plus what the city decided. People keep voting when they see it matters.

## 4. Measure
- Votes per poll, by channel (each QR code/poster is tracked already), repeat voters, and the time from flyer to vote.
