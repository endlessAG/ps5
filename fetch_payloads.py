import hashlib
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PAYLOAD_DIR = ROOT / "payloads"

RELAPSE = "https://raw.githubusercontent.com/ntfargo/Relapse-Exploit/main/payloads"
PLDMGR = "https://github.com/itsPLK/ps5-payload-manager/releases/download"

PAYLOADS = {
    "elfldr-ps5-1360.elf": (
        f"{RELAPSE}/elfldr-ps5-1360.elf",
        "de5dd480d12637527ba2d75e35de851adbb59c455293fa32588c492ef6b44b81",
    ),
    "etaHEN.elf": (
        f"{RELAPSE}/etaHEN.elf",
        "26034dfbb88dd8be344fee1876c387bfcba0386edb079014e18ec25580368f6d",
    ),
    "kexp_2026_05_25.bin": (
        f"{RELAPSE}/kexp_2026_05_25.bin",
        "7cfb3a8cb86db67893c360ae3531f460f800e9f24039797038e6e81fc50f18a9",
    ),
    "kstuff.elf": (
        f"{RELAPSE}/kstuff.elf",
        "858880a8adbedaabfaced025384f4f6f908cfe44f1a049070ad8df911c22b972",
    ),
    "shadowmountplus.elf": (
        f"{RELAPSE}/shadowmountplus.elf",
        "0b30a1c23b83ebb2aa6523c8caaa5801ee89bde00e90cb36f392a29bb0bdb403",
    ),
    "pldmgr_v0.5.2.elf": (
        f"{PLDMGR}/v0.5.2/pldmgr_v0.5.2.elf",
        "62b3ba2a4937c2afc502f9a4e7242cca538610ebb4ae2800c7c6f72e7f268e7c",
    ),
}


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def fetch(name, url, expected):
    target = PAYLOAD_DIR / name

    if target.exists() and sha256(target) == expected:
        print(f"ok       {name}")
        return True

    print(f"fetching {name}")
    try:
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read()
    except OSError as error:
        print(f"failed   {name}: {error}")
        return False

    actual = hashlib.sha256(data).hexdigest()
    if actual != expected:
        print(f"failed   {name}: sha256 mismatch")
        print(f"         expected {expected}")
        print(f"         actual   {actual}")
        return False

    target.write_bytes(data)
    print(f"ok       {name} ({len(data)} bytes)")
    return True


if __name__ == "__main__":
    PAYLOAD_DIR.mkdir(exist_ok=True)

    results = [fetch(name, url, expected) for name, (url, expected) in PAYLOADS.items()]
    missing = len(results) - sum(results)

    if missing:
        print(f"\n{missing} payload(s) unavailable")
        sys.exit(1)

    print(f"\nall {len(results)} payloads present in {PAYLOAD_DIR}")
