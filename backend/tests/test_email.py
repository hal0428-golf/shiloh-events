import imaplib
import json
import sys
import types
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import read_email


def test_login_failure_keeps_cached_events(monkeypatch, tmp_path):
    for k, v in {"IMAP_HOST": "imap.example.com", "IMAP_USER": "u", "IMAP_PASSWORD": "p", "ANTHROPIC_API_KEY": "k"}.items():
        monkeypatch.setenv(k, v)
    monkeypatch.setitem(sys.modules, "anthropic", types.SimpleNamespace(Anthropic=lambda: None))
    cache = tmp_path / "email_cache.json"
    cache.write_text(json.dumps({"<m1>": [{"id": "email_1", "title": "Bake Sale"}]}))
    monkeypatch.setattr(read_email, "CACHE", cache)

    class BadImap:
        def __init__(self, host):
            pass

        def login(self, user, pw):
            raise imaplib.IMAP4.error("Application-specific password required")

    monkeypatch.setattr(read_email.imaplib, "IMAP4_SSL", BadImap)
    assert [e["title"] for e in read_email.fetch_email_events()] == ["Bake Sale"]


def test_parent_schedule_newest_email_wins():
    a = read_email._parent_events(
        [{"date": "2026-11-09", "parent": "jeff", "note": "Handoff 5pm"}, {"date": "2026-11-10", "parent": "Carrie"}, {"date": "bad", "parent": "Jeff"}],
        "<a>", "2026-11-01T08:00:00-05:00")
    b = read_email._parent_events([{"date": "2026-11-10", "parent": "Jeff"}], "<b>", "2026-11-03T08:00:00-06:00")
    assert [(e["start"], e["title"], e["description"]) for e in a] == [("2026-11-09", "Jeff", "Handoff 5pm"), ("2026-11-10", "Carrie", None)]
    days = {e["start"]: e["title"] for e in read_email.latest_parent_days([{"title": "Bake Sale", "start": "2026-11-10"}] + a + b) if e.get("category") == "Parent"}
    assert days == {"2026-11-09": "Jeff", "2026-11-10": "Jeff"}


def test_parent_subject_match():
    assert read_email.PARENT_SUBJECT.search("Fwd: Parent Schedule for November")
    assert not read_email.PARENT_SUBJECT.search("Parent-teacher conference")


def test_images_found_in_email():
    from email.message import EmailMessage
    m = EmailMessage()
    m["Subject"] = "Parent Schedule"
    m.set_content("see picture")
    m.add_attachment(b"\x89PNG fake", maintype="image", subtype="png", filename="cal.png")
    imgs = read_email._images(m)
    assert len(imgs) == 1 and imgs[0]["source"]["media_type"] == "image/png"


def test_initials_become_names():
    days = read_email._parent_events([{"date": "2026-11-01", "parent": "J"}, {"date": "2026-11-03", "parent": "c."}, {"date": "2026-11-04", "parent": "Carrie"}], "<m>", "t")
    assert [d["title"] for d in days] == ["Jeff", "Carrie", "Carrie"]


def test_newer_schedule_replaces_older_written_events():
    old_s, new_s = "2026-11-01T00:00:00+00:00", "2026-11-09T00:00:00+00:00"
    old = read_email._parent_events([{"date": "2026-11-13", "parent": "J"}, {"date": "2026-12-01", "parent": "C"}], "<old>", old_s) + read_email._schedule_events(
        [{"title": "BB @ SRC", "start": "2026-11-13T15:00", "end": "2026-11-13T16:30"}, {"title": "Party", "start": "2026-12-01"}], "<old>", old_s)
    new = read_email._parent_events([{"date": "2026-11-13", "parent": "C"}], "<new>", new_s) + read_email._schedule_events(
        [{"title": "BB @ SRC", "start": "2026-11-13T15:30", "end": "2026-11-13T17:00"}], "<new>", new_s)
    school = [{"title": "Chapel", "start": "2026-11-13", "category": "Email"}]
    out = read_email.latest_parent_days(old + new + school)
    got = sorted((e["start"][:16], e["title"]) for e in out)
    assert got == [("2026-11-13", "Carrie"), ("2026-11-13", "Chapel"), ("2026-11-13T15:30", "BB @ SRC"), ("2026-12-01", "Carrie"), ("2026-12-01", "Party")]


def test_parent_prompt_formats():
    t = read_email.PARENT_PROMPT.format(received="Thu", subject="Parent Schedule", body="", parents="Jeff, Carrie", initials="J = Jeff, C = Carrie")
    assert "J = Jeff" in t and '{"days": [], "events": []}' in t
