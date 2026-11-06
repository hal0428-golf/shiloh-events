"""Build docs/events.json from the website calendar plus forwarded emails."""
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from access import lock, parse_codes
from read_email import fetch_email_events
from read_sites import fetch_site_events
from scrape_calendar import fetch_events

TZ = ZoneInfo("America/Chicago")
ROOT = Path(__file__).parent.parent
OUT = ROOT / "docs" / "events.json"
OVERRIDES = ROOT / "docs" / "overrides.json"
PARENTS = ROOT / "docs" / "parents.json"  # the parenting schedule set in the app
# Locked feed for the app; the workflow copies it to the public feed repo.
LOCKED_OUT = Path(os.environ.get("LOCKED_OUT", ROOT / "feed" / "events.locked.json"))


def _day(ev):
    return ev["start"][:10]


def _norm(t):
    return re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()


def in_window(ev, now):
    """Keep everything from the 1st of the current month on, so the month view is complete."""
    return ev["end"][:10] >= now.date().replace(day=1).isoformat()


def merge(web, mail, now):
    seen = {(_day(e), _norm(e["title"])) for e in web}
    merged = list(web)
    for e in mail:
        if e.get("category") == "Parent":  # a parent's name never duplicates a school event
            merged.append(e)
            continue
        n = _norm(e["title"])
        dup = any(d == _day(e) and (n in t or t in n) for d, t in seen)
        if not dup:
            merged.append(e)
    merged = [e for e in merged if in_window(e, now)]
    merged.sort(key=lambda e: (_day(e), e["allDay"] is False, e["start"], e["title"]))
    return merged


def main():
    now = datetime.now(TZ)
    web = fetch_events()
    if not web:
        sys.exit("No events scraped from the website; keeping previous events.json")
    mail = fetch_email_events()
    sites = fetch_site_events(now)  # web sites added in the app
    events = merge(web, mail + sites, now)
    feed = {"generated": now.isoformat(), "events": events}
    codes = parse_codes(os.environ.get("ACCESS_CODES"))
    if codes:
        # Edits made in the app ride inside the locked feed, since the repo itself is private.
        overrides = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {}
        LOCKED_OUT.parent.mkdir(parents=True, exist_ok=True)
        parents = json.loads(PARENTS.read_text(encoding="utf-8")) if PARENTS.exists() else None
        LOCKED_OUT.write_text(json.dumps(lock({**feed, "overrides": overrides, "parents": parents}, codes)))
        OUT.unlink(missing_ok=True)  # no readable copy anywhere once codes are in use
        print(f"wrote {len(events)} events ({len(web)} web, {len(mail)} email), locked for {len(codes)} codes")
    else:
        OUT.parent.mkdir(exist_ok=True)
        OUT.write_text(json.dumps(feed, indent=1))
        print(f"wrote {len(events)} events ({len(web)} web, {len(mail)} email), not locked (no ACCESS_CODES)")


if __name__ == "__main__":
    main()
