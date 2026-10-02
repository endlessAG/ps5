import { int64 } from "./utils/int64.js";

// elfldr is the loader this exploit starts, and it keeps listening on 127.0.0.1:9021
// once the chain has completed. So a successful connect means the console already
// ran the exploit, and there is nothing left to do: the kernel stage and the
// payload load are both skipped. The check has to run from the ROP chain, because
// a raw TCP listener cannot be told apart from a refused connection in the page.
//
// One attempt is enough. This runs before the exploit, so elfldr is either not
// there or has been listening since an earlier run, and there is no bind race to
// wait out.
export async function isElfldrListening(p, chain) {
  const address = p.malloc(16);
  p.write8(address, new int64(0, 0));
  p.write8(address.add32(8), new int64(0, 0));
  p.write4(address, 0x3d230210); // sin_len 0x10, AF_INET, port 9021
  p.write4(address.add32(4), 0x0100007f); // 127.0.0.1

  const socket = await chain.syscall(SYS_SOCKET, 2, 1, 0);
  const fd = socket.low | 0;
  if (fd < 0) return false;
  try {
    const connected = await chain.syscall(SYS_CONNECT, fd, address, 16);
    return (connected.low >>> 0) === 0;
  } finally {
    await chain.syscall(SYS_CLOSE, fd);
  }
}
