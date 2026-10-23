"""Scrape the Shiloh Christian School calendar (Finalsite) into event dicts."""
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import requests
from bs4 import BeautifulSoup

BASE = "https://www.shilohsaints.org"
CALENDAR_PAGE = "/fs/pages/564"
DEFAULT_ELEMENT_ID = 3821
TZ = ZoneInfo("America/Chicago")
HEADERS = {"User-Agent": "ShilohEventsApp/1.0 (family school calendar viewer)"}
OCCUR = re.compile(
    r"^(\d+)_(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)_(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)$"
)


KNOWN_COLORS = {
    "#051b41": "All School Calendar",
    "#a8ccf8": "Athletics",
    "#1466e2": "Secondary School",
    "#939598": "Middle School",
    "#c5a35a": "Elementary School",
}
HEX = re.compile(r"#[0-9a-fA-F]{6}")


def _hex(style):
    m = HEX.search(style or "")
    return m.group(0).lower() if m else None


def _utc(s):
    return datetime.strptime(s, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)


def _location(title):
    m = re.search(r"\s@\s(.+)$", title)
    if not m:
        return None
    return re.sub(r"\s*\([^)]*\)\s*$", "", m.group(1)).strip() or None


def parse_month(html):
    """Return a list of event dicts from one month of calendar HTML."""
    soup = BeautifulSoup(html, "html.parser")
    events = {}
    colors = dict(KNOWN_COLORS)
    for icon in soup.select(".fsElementEventColorIcon"):
        c = _hex(icon.get("style"))
        if c and icon.get("title"):
            colors[c] = icon["title"]
    for a in soup.select("a[data-occur-id]"):
        m = OCCUR.match(a["data-occur-id"])
        if not m or m.group(0) in events:
            continue
        title = (a.get("title") or a.get_text()).strip()
        start, end = _utc(m.group(2)), _utc(m.group(3))
        midnight = lambda d: (d.hour, d.minute, d.second) == (0, 0, 0)
        all_day = midnight(start) and midnight(end)
        if all_day:
            s = start.date().isoformat()
            e = (end - timedelta(days=1)).date().isoformat()
            if e < s:
                e = s
        else:
            s = start.astimezone(TZ).isoformat()
            e = end.astimezone(TZ).isoformat()
        cat = None
        parent = a.find_parent(class_="fsCalendarEvent")
        if parent:
            icon = parent.select_one(".fsElementEventColorIcon")
            if icon is not None:
                cat = icon.get("title")
        if cat is None:
            long_ev = a.find_parent(class_="fsCalendarLongEvent")
            if long_ev is not None:
                c = _hex(long_ev.get("style"))
                if c is None:
                    bg = long_ev.select_one(".fsCalendarLongEventBackground")
                    c = _hex(bg.get("style")) if bg else None
                cat = colors.get(c)
        events[m.group(0)] = {
            "id": m.group(0),
            "title": title,
            "start": s,
            "end": e,
            "allDay": all_day,
            "category": cat,
            "location": _location(title),
            "description": None,
            "source": "web",
        }
    return list(events.values())


def discover_element_id(session):
    try:
        r = session.get(BASE + CALENDAR_PAGE, headers=HEADERS, timeout=30)
        m = re.search(r'class="[^"]*fsCalendar[^"]*"\s+id="fsEl_(\d+)"', r.text)
        return int(m.group(1)) if m else DEFAULT_ELEMENT_ID
    except requests.RequestException:
        return DEFAULT_ELEMENT_ID


def fetch_month(session, element_id, year, month):
    url = f"{BASE}/fs/elements/{element_id}"
    r = session.get(url, params={"cal_date": f"{year}-{month:02d}-23"}, headers=HEADERS, timeout=30)
    r.raise_for_status()
    return r.text


def fetch_events(months_ahead=9, today=None):
    today = today or datetime.now(TZ).date()
    session = requests.Session()
    element_id = discover_element_id(session)
    out = {}
    y, mo = today.year, today.month
    for _ in range(months_ahead + 1):
        for ev in parse_month(fetch_month(session, element_id, y, mo)):
            out[ev["id"]] = ev
        mo += 1
        if mo > 12:
            y, mo = y + 1, 1
    return list(out.values())
