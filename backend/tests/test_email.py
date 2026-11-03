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
