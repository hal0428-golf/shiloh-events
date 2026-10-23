"""Build docs/events.json from the website calendar plus forwarded emails."""
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from read_email import fetch_email_events
from scrape_calendar import fetch_events

TZ = ZoneInfo("America/Chicago")
OUT = Path(__file__).parent.parent / "docs" / "events.json"


def _day(ev):
    return ev["start"][:10]


def _norm(t):
    return re.sub(r"[^a-z0-9]+", " ", t.lower()).strip()


def is_current_or_upcoming(ev, now):
    end = ev["end"]
    if ev["allDay"]:
        return end >= now.date().isoformat()
    return datetime.fromisoformat(end) >= now


def merge(web, mail, now):
    seen = {(_day(e), _norm(e["title"])) for e in web}
    merged = list(web)
    for e in mail:
        n = _norm(e["title"])
        dup = any(d == _day(e) and (n in t or t in n) for d, t in seen)
        if not dup:
            merged.append(e)
    merged = [e for e in merged if is_current_or_upcoming(e, now)]
    merged.sort(key=lambda e: (_day(e), e["allDay"] is False, e["start"], e["title"]))
    return merged


def main():
    now = datetime.now(TZ)
    web = fetch_events()
    if not web:
        sys.exit("No events scraped from the website; keeping previous events.json")
    mail = fetch_email_events()
    events = merge(web, mail, now)
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps({"generated": now.isoformat(), "events": events}, indent=1))
    print(f"wrote {len(events)} events ({len(web)} web, {len(mail)} email)")


if __name__ == "__main__":
    main()
