import json
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import read_sites

ICS = b"""BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:1
SUMMARY:5th Gold vs Bentonville
DTSTART;TZID=America/Chicago:20261114T100000
DTEND;TZID=America/Chicago:20261114T110000
LOCATION:Shiloh West
END:VEVENT
BEGIN:VEVENT
UID:2
SUMMARY:Practice 5th Gold
DTSTART:20261110T230000Z
DTEND:20261111T000000Z
RRULE:FREQ=WEEKLY;COUNT=3
END:VEVENT
BEGIN:VEVENT
UID:3
SUMMARY:Varsity tournament
DTSTART;VALUE=DATE:20261120
DTEND;VALUE=DATE:20261122
END:VEVENT
END:VCALENDAR
"""


class Resp:
    def __init__(self, body):
        self.content, self.text = body, body.decode()

    def raise_for_status(self):
        pass


def test_ics_with_keywords(monkeypatch, tmp_path):
    src = tmp_path / "sources.json"
    src.write_text(json.dumps([{"name": "West BB", "url": "webcal://example.com/cal.ics", "keywords": "5th, gold"}, {"name": "bad", "url": "ftp://x"}]))
    monkeypatch.setattr(read_sites, "SOURCES", src)
    monkeypatch.setattr(read_sites, "CACHE", tmp_path / "cache.json")
    seen = []
    monkeypatch.setattr(read_sites.requests, "get", lambda url, **k: seen.append(url) or Resp(ICS))
    evs = read_sites.fetch_site_events(datetime(2026, 11, 6, tzinfo=read_sites.TZ))
    assert seen == ["https://example.com/cal.ics"]
    got = sorted((e["start"][:16], e["title"]) for e in evs)
    assert got == [("2026-11-10T17:00", "Practice 5th Gold"), ("2026-11-14T10:00", "5th Gold vs Bentonville"),
                   ("2026-11-17T17:00", "Practice 5th Gold"), ("2026-11-24T17:00", "Practice 5th Gold")]
    assert all(e["category"] == "West BB" and e["source"] == "site" for e in evs)


def test_all_day_end_and_no_keywords(monkeypatch, tmp_path):
    src = tmp_path / "sources.json"
    src.write_text(json.dumps([{"name": "All", "url": "https://example.com/cal.ics"}]))
    monkeypatch.setattr(read_sites, "SOURCES", src)
    monkeypatch.setattr(read_sites, "CACHE", tmp_path / "cache.json")
    monkeypatch.setattr(read_sites.requests, "get", lambda url, **k: Resp(ICS))
    evs = read_sites.fetch_site_events(datetime(2026, 11, 6, tzinfo=read_sites.TZ))
    t = [e for e in evs if e["title"] == "Varsity tournament"][0]
    assert (t["start"], t["end"], t["allDay"]) == ("2026-11-20", "2026-11-21", True)
    assert len(evs) == 5


def test_failed_site_keeps_cached(monkeypatch, tmp_path):
    src = tmp_path / "sources.json"
    src.write_text(json.dumps([{"name": "A", "url": "https://a.example/x"}]))
    cache = tmp_path / "cache.json"
    cache.write_text(json.dumps({"https://a.example/x|": {"hash": "h", "events": [{"title": "Old", "start": "2026-11-20", "category": "A"}]}}))
    monkeypatch.setattr(read_sites, "SOURCES", src)
    monkeypatch.setattr(read_sites, "CACHE", cache)

    def boom(url, **k):
        raise OSError("down")

    monkeypatch.setattr(read_sites.requests, "get", boom)
    assert [e["title"] for e in read_sites.fetch_site_events()] == ["Old"]
