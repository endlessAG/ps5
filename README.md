# PS5 Relapse Exploit
Supported firmware: 7.00 through 13.60.

## Usage
- In the network settings, set Primary DNS to `45.56.67.85` (Recommended)
- Run `python serve.py` locally, or open https://ntfargo.github.io/Relapse-Exploit/ on the PS5. Both paths need `payloads/` present, since the kernel stage fetches the binaries over HTTP at runtime.
- The default payloads are stored in `payloads/` after a successful run, the ELF loader listens on port `9021`.
- Once elfldr is listening, the payloads are sent automatically in this order, 4 seconds apart: `pldmgr_v0.5.2.elf`, `kstuff.elf`, `shadowmountplus.elf`, `etaHEN.elf`. The order and the settle delay are `PAYLOAD_SEQUENCE` and `PAYLOAD_SETTLE_MS` in `src/kexp.js`; a per-payload `delayAfter` overrides the delay.

## Stability notes
Webkit may need several attempts, reload the page if the browser stalls. The kernel exploit may hang or panic the console, so reboot before trying again if that happens.

## Exploit chain
Browser stage uses JSC info leaks and a structured clone object pool mismatch to corrupt a typedarray. The kernel stage combines a address leak with an `aio_multi_wait` uaf race to establish kernel r/w.

## Payloads
`payloads/` is committed so a fresh clone runs without a setup step. These are third-party binaries, redistributed as-is and not covered by this repo's MIT license:

| File | Source |
| --- | --- |
| `elfldr-ps5-1360.elf` | [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit) |
| `etaHEN.elf` | [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit) |
| `kexp_2026_05_25.bin` | [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit) |
| `kstuff.elf` | [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit), locally patched |
| `shadowmountplus.elf` | [ntfargo/Relapse-Exploit](https://github.com/ntfargo/Relapse-Exploit) |
| `pldmgr_v0.5.2.elf` | [itsPLK/ps5-payload-manager](https://github.com/itsPLK/ps5-payload-manager) v0.5.2 |

Run `python fetch_payloads.py` to verify the committed files against pinned SHA-256 hashes, or to re-download any that are missing or corrupt. It is safe to re-run.

`kstuff.elf` carries a one-byte local patch: the `sub rax` immediate at `0x14372f` is changed from `0x00a8406e` to `0x00aa406e`. The script knows both the pristine and patched hashes and re-applies the byte after downloading, so a fresh clone reproduces it rather than silently reverting to the upstream binary. Remove the `patch` key from that entry to track the unmodified upstream build.

## Credits
ntfargo, ufm42, Sonic-Iso, Jordy, Dr. Yenyen, TheFlow, SlidyBat,  Flatz, cow, nhk, bollarz, Sleirsgoevy, EchoStretch, EarthOnion, itsPLK.

## Disclaimer
This project is intended for **educational and security research purposes only**. It does not endorse piracy, unauthorized access, or misuse of commercial devices. Use it only on devices you own or are authorized to test, and comply with applicable laws and regulations.

The software is provided as-is, without warranty. You assume the risks of using it, including system instability, data loss, and account bans. The maintainers accept no liability for resulting damage. 
