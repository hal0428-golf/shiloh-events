# Shiloh Events

iPhone app showing current and upcoming events from the Shiloh Christian School website calendar plus any events found in forwarded Shiloh emails.

```
Shiloh website ─┐
                ├─ GitHub Action (every 3h) ─► docs/events.json ─► GitHub Pages ─► iPhone app
Forwarded email ┘   (backend/build_events.py)
```

## Backend (`backend/`)
- `scrape_calendar.py` reads the Finalsite calendar (`/fs/elements/3821?cal_date=…`), which includes UTC start/end per event. No AI needed.
- `read_email.py` (optional) reads a dedicated mailbox over IMAP and asks Claude to extract events. Each email is processed once (cached in `backend/data/email_cache.json`).
- `build_events.py` merges both, drops past events, writes `docs/events.json`.
- Tests: `cd backend && pip install -r requirements.txt && pytest`

## Setup checklist
1. Create a GitHub repo (e.g. `shiloh-events`), push this folder, enable Pages from `/docs` on `main`.
2. Repo secrets (Settings › Secrets › Actions). Email is optional; skip all four to run website-only:
   `IMAP_HOST` (e.g. imap.gmail.com), `IMAP_USER`, `IMAP_PASSWORD` (an app password), `ANTHROPIC_API_KEY`.
3. Run the "Update events" workflow once by hand (Actions tab). **First run is the real test of the scraper**; the shilohsaints.org site could not be reached from the dev sandbox, so it was only tested against a fixture.
4. Edit `app/src/config.ts`: set `EVENTS_URL` and `FORWARD_ADDRESS`.
5. Build: `cd app && npm install && npx eas build -p ios --profile production`, then `npx eas submit -p ios` for TestFlight.

Until the feed is live, the app shows a small bundled sample of real events (Oct 23–30, 2026).
