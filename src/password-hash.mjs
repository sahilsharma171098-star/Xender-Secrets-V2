// Untagged historical hashes used 180000 iterations. Never reinterpret them
// using the new cost: that would invalidate credentials or permit a downgrade.
const PREFIX = 'pbkdf2-sha256$100000$';
const encode = bytes => btoa(String.fromCharCode(...bytes));
const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
async function derive(password, salt, iterations, subtle) {
  const key = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return encode(new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', salt: decode(salt), iterations, hash: 'SHA-256' }, key, 256)));
}
export async function passwordHash(password, salt, subtle = crypto.subtle) {
  return PREFIX + await derive(password, salt, 100000, subtle);
}
export async function verifyPassword(password, salt, stored, subtle = crypto.subtle) {
  const modern = stored.startsWith(PREFIX);
  const digest = modern ? stored.slice(PREFIX.length) : stored;
  if (!/^[A-Za-z0-9+/]{43}=$/.test(digest)) return { ok: false };
  let candidate;
  try { candidate = await derive(password, salt, modern ? 100000 : 180000, subtle); }
  catch (error) {
    // Workers rejects historical cost before derivation. Preserve the row and
    // require a separately verified recovery identity; never grant a session.
    if (!modern && /iteration counts above 100000 are not supported/.test(String(error?.message))) {
      return { ok: false, recoveryRequired: true };
    }
    throw error;
  }
  let difference = candidate.length ^ digest.length;
  for (let i = 0; i < candidate.length; i++) difference |= candidate.charCodeAt(i) ^ digest.charCodeAt(i);
  return { ok: difference === 0 };
}
