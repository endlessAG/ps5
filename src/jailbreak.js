import { int64 } from "./utils/int64.js";

// elfldr is the loader this exploit starts, and it keeps listening on 127.0.0.1:9021
// once the chain has completed. So a successful connect means the console already
// ran the exploit, and there is nothing left to do: the kernel stage and the
// payload load are both skipped. The check has to run from the ROP chain, because
// a raw TCP listener cannot be told apart from a refused connection in the page.
const PROBE_ATTEMPTS = 2;
const PROBE_DELAY_MS = 150;

function elfldrAddress(p) {
  const address = p.malloc(16);
  p.write8(address, new int64(0, 0));
  p.write8(address.add32(8), new int64(0, 0));
  p.write4(address, 0x3d230210); // sin_len 0x10, AF_INET, port 9021
  p.write4(address.add32(4), 0x0100007f); // 127.0.0.1
  return address;
}

export async function isElfldrListening(p, chain) {
  const address = elfldrAddress(p);
  for (let attempt = 0; ; attempt++) {
    const socket = await chain.syscall(SYS_SOCKET, 2, 1, 0);
    const fd = socket.low | 0;
    if (fd >= 0) {
      const connected = await chain.syscall(SYS_CONNECT, fd, address, 16);
      const listening = (connected.low >>> 0) === 0;
      await chain.syscall(SYS_CLOSE, fd);
      if (listening) return true;
    }
    if (attempt + 1 >= PROBE_ATTEMPTS) return false;
    await new Promise((resolve) => setTimeout(resolve, PROBE_DELAY_MS));
  }
}
