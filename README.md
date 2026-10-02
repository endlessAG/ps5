# PS5 Relapse Exploit (fork)

A fork of [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit), hosted in the local
`PS4 User Guide Selfhost` tree. All exploit logic, offsets and payload provenance come from upstream;
this fork changes the host, the UI and the payload delivery. Upstream is MIT licensed, © Nathan Fargo.

Supported firmware: 7.00 through 13.60.

## What this fork changes

- **Automatic payload sequence.** Once elfldr is listening, `pldmgr` is sent automatically; everything
  else is installed from its menu. The order and the per-payload delay live in `PAYLOAD_SEQUENCE` and
  `PAYLOAD_SETTLE_MS` in `src/kexp.js`, and a per-payload `delayAfter` overrides the delay.
- **Already-jailbroken check.** Before the kernel stage, `src/jailbreak.js` tries to connect to
  `127.0.0.1:9021`, the port elfldr listens on once the chain has completed. If it answers, the exploit
  already ran, so the kernel stage and the payload load are skipped and the page reports
  `Already jailbroken`. The check runs from the ROP chain, after the WebKit stage, because a raw TCP
  listener cannot be told apart from a refused connection from the page.
- **Progress UI.** The raw log console is replaced by a four-stage display (WebKit, Read/Write, Kernel,
  Payloads) using PlayStation button shapes. The detailed log moved into a collapsible drawer so the
  current stage stays visible while the exploit runs. Stages that were skipped are drawn dim.
- **Payloads committed.** The binaries are tracked in `payloads/`, so a fresh clone runs with no fetch step.
- **Fewer allocations during kernel r/w.** The sysctl window helpers reuse persistent buffers rather than
  allocating on every kernel read and write. Measured on the AIO cleanup path, this drops `p.malloc`
  calls from 3.00 to 0.00 per call and removes roughly 1 MB of permanently pinned memory per run.

## Usage

- Open the host on the PS5 at the self-hosted URL for this directory.
- Alternatively, run `python serve.py` locally, which serves this directory on port `8000`.
- The page fetches the binaries in `payloads/` over HTTP at runtime, so whatever server hosts
  `index.html` must also expose `payloads/` next to it. Once the kernel stage finishes, the ELF loader
  listens on port `9021`.

## Repository layout

| Path | Purpose |
| --- | --- |
| `index.html`, `src/site.js` | Progress UI, stage rail and log drawer |
| `src/main.js` | Entry point, wires the stages together and sends the payload sequence |
| `src/jailbreak.js` | elfldr port probe, skips the kernel stage on an already-jailed console |
| `src/relapse_exploit.js` | Kernel exploit, OID steering, AIO cleanup, kernel r/w primitives |
| `src/rop.js`, `src/utils/` | ROP chain, syscall shims, `int64` and memory helpers |
| `offsets/*.js` | Per-firmware offsets, selected at runtime by `src/firmware.js` |
| `payloads/` | Committed third-party binaries, see [Payloads](#payloads) |
| `serve.py` | Static server for local testing |
| `fetch_payloads.py` | Hash verification and payload repair |

## Stability notes

Webkit may need several attempts, reload the page if the browser stalls. The kernel exploit may hang or
panic the console, so reboot before trying again if that happens.

## Exploit chain

Browser stage uses JSC info leaks and a structured clone object pool mismatch to corrupt a typedarray.
The kernel stage combines a address leak with an `aio_multi_wait` uaf race to establish kernel r/w.

## Payloads

`payloads/` is committed so a fresh clone runs without a setup step. These are third-party binaries,
redistributed as-is and not covered by this repo's MIT license:

| File | Source |
| --- | --- |
| `elfldr-ps5-1360.elf` | [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit) |
| `kexp_2026_05_25.bin` | [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit) |
| `pldmgr_v0.5.2.elf` | [itsPLK/ps5-payload-manager](https://github.com/itsPLK/ps5-payload-manager) v0.5.2 |

`pldmgr_v0.5.2.elf` is the only payload the exploit loads by default; further payloads are installed
from its own menu. `fetch_payloads.py` verifies every committed binary against a pinned SHA-256. Run it
to verify the committed files or to repair any that are missing or corrupt. It is safe to re-run, and is
never required for a fresh clone. To track a locally patched build, add a `patch` key with the
`(offset, before, after)` edit plus the patched `sha256` and the pristine `upstream_sha256`; the edit is
re-applied after downloading.

## Credits

ntfargo, ufm42, Sonic-Iso, Jordy, Dr. Yenyen, TheFlow, SlidyBat, Flatz, cow, nhk, bollarz, Sleirsgoevy,
EchoStretch, EarthOnion, itsPLK.

## Disclaimer

This project is intended for **educational and security research purposes only**. It does not endorse
piracy, unauthorized access, or misuse of commercial devices. Use it only on devices you own or are
authorized to test, and comply with applicable laws and regulations.

The software is provided as-is, without warranty. You assume the risks of using it, including system
instability, data loss, and account bans. The maintainers accept no liability for resulting damage.
