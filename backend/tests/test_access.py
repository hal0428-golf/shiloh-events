import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
import access


def test_only_listed_codes_unlock():
    a, b = access.new_code(), access.new_code()
    feed = access.lock({"events": [{"title": "Jeff"}]}, access.parse_codes(f"Grandma: {a}\n# old\n\n{b}\n"))
    assert len(feed["keys"]) == 2
    assert access.unlock(feed, a.lower().replace("-", " "))["events"][0]["title"] == "Jeff"  # case and dashes don't matter
    assert access.unlock(feed, b) is not None
    assert access.unlock(feed, access.new_code()) is None
    assert "Jeff" not in str(feed)


def test_short_lines_ignored():
    assert access.parse_codes("Bob: 123\nhello") == []
