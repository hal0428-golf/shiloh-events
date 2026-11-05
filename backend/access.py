"""Lock the events feed so only people with an access code can read it.

The feed is encrypted with a fresh random key on every run. That key is then stored once per
access code, each copy locked with a key derived from the code. Removing a code from the
ACCESS_CODES secret locks that person out on the next run; nobody else has to do anything.

ACCESS_CODES holds one code per line, optionally with a name: "Grandma: K7QM-29XP-FT4W".
"""
import base64
import hashlib
import json
import os
import re
import secrets

SALT = b"shiloh-events-access-v1"
ITERATIONS = 30000  # the app (app/src/access.ts) must use the same salt and count
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O, 1/I/L


def normalize(code):
    return re.sub(r"[^A-Z0-9]", "", code.upper())


def derive(code):
    """(lock key, public id) for one access code."""
    dk = hashlib.pbkdf2_hmac("sha256", normalize(code).encode(), SALT, ITERATIONS, 48)
    return dk[:32], dk[32:].hex()


def parse_codes(text):
    out = []
    for line in (text or "").splitlines():
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        code = line.rsplit(":", 1)[-1]
        if len(normalize(code)) >= 10:
            out.append(code)
    return out


def b64(b):
    return base64.b64encode(b).decode()


def lock(payload, codes):
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    key = AESGCM.generate_key(bit_length=256)
    iv = secrets.token_bytes(12)
    data = AESGCM(key).encrypt(iv, json.dumps(payload, separators=(",", ":")).encode(), None)
    keys = []
    for code in codes:
        kek, cid = derive(code)
        kiv = secrets.token_bytes(12)
        keys.append({"id": cid, "iv": b64(kiv), "k": b64(AESGCM(kek).encrypt(kiv, key, None))})
    secrets.SystemRandom().shuffle(keys)
    return {"v": 1, "iv": b64(iv), "data": b64(data), "keys": keys}


def unlock(feed, code):
    """For tests: the payload, or None if the code isn't on the list."""
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    kek, cid = derive(code)
    for k in feed["keys"]:
        if k["id"] == cid:
            key = AESGCM(kek).decrypt(base64.b64decode(k["iv"]), base64.b64decode(k["k"]), None)
            return json.loads(AESGCM(key).decrypt(base64.b64decode(feed["iv"]), base64.b64decode(feed["data"]), None))
    return None


def new_code():
    c = "".join(secrets.choice(ALPHABET) for _ in range(12))
    return f"{c[:4]}-{c[4:8]}-{c[8:]}"


if __name__ == "__main__":
    # python backend/access.py Grandma Carrie  ->  one new code per name, to paste into the ACCESS_CODES secret
    import sys

    for name in sys.argv[1:] or ["Person"]:
        print(f"{name}: {new_code()}")
