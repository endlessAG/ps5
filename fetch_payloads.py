import hashlib
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAYLOAD_DIR = ROOT / "payloads"

RELAPSE = "https://raw.githubusercontent.com/ntfargo/Relapse-Exploit/main/payloads"
PLDMGR = "https://github.com/itsPLK/ps5-payload-manager/releases/download"

# A payload may carry a local patch. When it does, "sha256" is the hash of the
# patched file, "upstream_sha256" is the hash of the pristine download, and
# "patch" is the (offset, before, after) byte edit. The edit is re-applied after
# downloading, so payloads/ can still be rebuilt from scratch on a fresh clone.
PAYLOADS = {
    "elfldr-ps5-1360.elf": {
        "url": f"{RELAPSE}/elfldr-ps5-1360.elf",
        "sha256": "de5dd480d12637527ba2d75e35de851adbb59c455293fa32588c492ef6b44b81",
    },
    "kexp_2026_05_25.bin": {
        "url": f"{RELAPSE}/kexp_2026_05_25.bin",
        "sha256": "7cfb3a8cb86db67893c360ae3531f460f800e9f24039797038e6e81fc50f18a9",
    },
    "pldmgr_v0.5.2.elf": {
        "url": f"{PLDMGR}/v0.5.2/pldmgr_v0.5.2.elf",
        "sha256": "62b3ba2a4937c2afc502f9a4e7242cca538610ebb4ae2800c7c6f72e7f268e7c",
    },
}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def apply_patch(data, patch):
    offset, before, after = patch
    if data[offset] != before:
        return None
    patched = bytearray(data)
    patched[offset] = after
    return bytes(patched)


def make_final(data, spec):
    """Return the bytes to install, or None if they cannot match the pin."""
    if sha256(data) == spec["sha256"]:
        return data
    patch = spec.get("patch")
    if not patch or sha256(data) != spec["upstream_sha256"]:
        return None
    patched = apply_patch(data, patch)
    if patched is None or sha256(patched) != spec["sha256"]:
        return None
    return patched


def fetch(name, spec):
    target = PAYLOAD_DIR / name
    note = spec.get("note")

    if target.exists():
        existing = target.read_bytes()
        digest = sha256(existing)
        if digest == spec["sha256"]:
            print(f"ok       {name}" + (f" (patched: {note})" if note else ""))
            return True
        # Present but pristine: bring it up to date rather than re-downloading.
        if spec.get("patch") and digest == spec["upstream_sha256"]:
            patched = apply_patch(existing, spec["patch"])
            if patched is not None and sha256(patched) == spec["sha256"]:
                target.write_bytes(patched)
                print(f"ok       {name} (patch applied in place: {note})")
                return True
        print(f"stale    {name}: unexpected contents, re-downloading")

    print(f"fetching {name}")
    try:
        with urllib.request.urlopen(spec["url"], timeout=60) as response:
            data = response.read()
    except OSError as error:
        print(f"failed   {name}: {error}")
        return False

    final = make_final(data, spec)
    if final is None:
        print(f"failed   {name}: sha256 mismatch")
        print(f"         expected {spec['sha256']}")
        if spec.get("upstream_sha256"):
            print(f"         upstream {spec['upstream_sha256']}")
        print(f"         actual   {sha256(data)}")
        return False

    target.write_bytes(final)
    applied = " + patch" if final is not data else ""
    print(f"ok       {name} ({len(final)} bytes{applied})")
    return True


if __name__ == "__main__":
    PAYLOAD_DIR.mkdir(exist_ok=True)

    results = [fetch(name, spec) for name, spec in PAYLOADS.items()]
    missing = len(results) - sum(results)

    if missing:
        print(f"\n{missing} payload(s) unavailable")
        sys.exit(1)

    print(f"\nall {len(results)} payloads present in {PAYLOAD_DIR}")
