# PS5 Relapse Exploit (fork)

A fork of [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit), hosted in the local
`PS4 User Guide Selfhost` tree. All exploit logic, offsets and payload provenance come from upstream;
this fork changes the host, the UI and the payload delivery. Upstream is MIT licensed, © Nathan Fargo.

Supported firmware: 7.00 through 13.60.

## What this fork changes

- **Automatic payload sequence.** Once elfldr is listening, payloads are sent in a fixed order 4 seconds
  apart instead of being optional. The order and the delay live in `PAYLOAD_SEQUENCE` and
  `PAYLOAD_SETTLE_MS` in `src/kexp.js`, and a per-payload `delayAfter` overrides the delay.
- **Progress UI.** The raw log console is replaced by a four-stage display (WebKit, Read/Write, Kernel,
  Payloads) using PlayStation button shapes. The detailed log moved into a collapsible drawer so the
  current stage stays visible while the exploit runs.
- **Payloads committed.** The binaries are tracked in `payloads/`, so a fresh clone runs with no fetch step.
- **Reproducible `kstuff.elf` patch.** `fetch_payloads.py` verifies every binary against a pinned SHA-256
  and re-applies the local patch after downloading, instead of silently reverting to the upstream build.
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
| `etaHEN.elf` | [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit) |
| `kexp_2026_05_25.bin` | [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit) |
| `kstuff.elf` | [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit), locally patched |
| `shadowmountplus.elf` | [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit) |
| `pldmgr_v0.5.2.elf` | [itsPLK/ps5-payload-manager](https://github.com/itsPLK/ps5-payload-manager) v0.5.2 |

`kstuff.elf` carries a one-byte local patch: the `sub rax` immediate at `0x14372f` is changed from
`0x00a8406e` to `0x00aa406e`. `fetch_payloads.py` knows both the pristine and patched hashes and re-applies
the byte after downloading. Run it to verify the committed files or to repair any that are missing or
corrupt. It is safe to re-run, and is never required for a fresh clone. Remove the `patch` key from that
entry to track the unmodified upstream build.

## Credits

ntfargo, ufm42, Sonic-Iso, Jordy, Dr. Yenyen, TheFlow, SlidyBat, Flatz, cow, nhk, bollarz, Sleirsgoevy,
EchoStretch, EarthOnion, itsPLK.

## Disclaimer

This project is intended for **educational and security research purposes only**. It does not endorse
piracy, unauthorized access, or misuse of commercial devices. Use it only on devices you own or are
authorized to test, and comply with applicable laws and regulations.

The software is provided as-is, without warranty. You assume the risks of using it, including system
instability, data loss, and account bans. The maintainers accept no liability for resulting damage.
