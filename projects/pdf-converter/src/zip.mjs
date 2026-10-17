// ZIP with STORE compression. Images are already compressed. No external code.
const table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  table[n] = c >>> 0;
}
function crc32(bytes) { let crc = 0xffffffff; for (const byte of bytes) crc = table[(crc ^ byte) & 255] ^ (crc >>> 8); return (crc ^ 0xffffffff) >>> 0; }
function header(size) { const data = new Uint8Array(size); return { data, view: new DataView(data.buffer) }; }
export function createZip(entries) {
  if (!entries.length || entries.length > 50) throw new Error("ZIP exports support 1 to 50 pages.");
  const parts = [], central = []; let offset = 0, centralSize = 0;
  for (const entry of entries) {
    const name = new TextEncoder().encode(entry.name), body = entry.bytes;
    const crc = crc32(body), local = header(30), c = header(46);
    local.view.setUint32(0, 0x04034b50, true); local.view.setUint16(4, 20, true); local.view.setUint16(6, 0x800, true); local.view.setUint16(12, 0x5c21, true);
    local.view.setUint32(14, crc, true); local.view.setUint32(18, body.byteLength, true); local.view.setUint32(22, body.byteLength, true); local.view.setUint16(26, name.length, true);
    c.view.setUint32(0, 0x02014b50, true); c.view.setUint16(4, 20, true); c.view.setUint16(6, 20, true); c.view.setUint16(8, 0x800, true); c.view.setUint16(14, 0x5c21, true);
    c.view.setUint32(16, crc, true); c.view.setUint32(20, body.byteLength, true); c.view.setUint32(24, body.byteLength, true); c.view.setUint16(28, name.length, true); c.view.setUint32(42, offset, true);
    parts.push(local.data, name, body); central.push(c.data, name); centralSize += c.data.length + name.length;
    offset += local.data.length + name.length + body.byteLength;
  }
  const end = header(22); end.view.setUint32(0, 0x06054b50, true); end.view.setUint16(8, entries.length, true); end.view.setUint16(10, entries.length, true); end.view.setUint32(12, centralSize, true); end.view.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end.data], { type: "application/zip" });
}
