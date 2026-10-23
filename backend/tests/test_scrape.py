import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).parent.parent))
from build_events import merge
from scrape_calendar import parse_month

HTML = (Path(__file__).parent / "fixture_month.html").read_text()


def test_parse_dedupes_and_converts_times():
    evs = {e["title"]: e for e in parse_month(HTML)}
    assert len(evs) == 4
    salt = evs["8th grade SALT"]
    assert salt["start"] == "2026-09-28T12:32:00-05:00" and not salt["allDay"]
    assert salt["category"] == "Secondary School"
    fb = evs["Football @ Central (9th/JV)"]
    assert fb["location"] == "Central" and fb["start"].startswith("2026-09-28T17:30")


def test_all_day_and_multiday():
    evs = {e["title"]: e for e in parse_month(HTML)}
    g = evs["Golf Girls State @ Searcy High School"]
    assert g["allDay"] and g["start"] == g["end"] == "2026-09-29"
    assert g["location"] == "Searcy High School"
    assert g["category"] == "Athletics"
    c = evs["B3 9th Grade Father Son Campout"]
    assert c["start"] == "2026-10-25" and c["end"] == "2026-10-26"
    assert c["category"] == "Elementary School"


def test_merge_filters_past_and_dedupes_email():
    now = datetime(2026, 10, 2, 8, 0, tzinfo=ZoneInfo("America/Chicago"))
    web = parse_month(HTML)
    mail = [{"id": "e1", "title": "Father Son Campout", "start": "2026-10-25", "end": "2026-10-25", "allDay": True, "source": "email"},
            {"id": "e2", "title": "Bake Sale", "start": "2026-10-02", "end": "2026-10-02", "allDay": True, "source": "email"}]
    out = merge(web, mail, now)
    titles = [e["title"] for e in out]
    assert "8th grade SALT" not in titles  # September, before the window
    web = web + [{"id": "x", "title": "Oct 1 thing", "start": "2026-10-01", "end": "2026-10-01", "allDay": True, "source": "web"}]
    assert "Oct 1 thing" in [e["title"] for e in merge(web, mail, now)]  # earlier this month is kept
    assert "Bake Sale" in titles
    assert titles.count("B3 9th Grade Father Son Campout") == 1 and "Father Son Campout" not in titles
