import test from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { passwordHash, verifyPassword } from '../../src/password-hash.mjs';
const salt = Buffer.from('fixed-test-salt!!').toString('base64');
test('versioned hashes match independent PBKDF2 and reject wrong credentials', async () => {
  const hash = await passwordHash('correct-password', salt);
  assert.equal(hash, 'pbkdf2-sha256$100000$' + pbkdf2Sync('correct-password', Buffer.from(salt,'base64'),100000,32,'sha256').toString('base64'));
  assert.equal((await verifyPassword('correct-password',salt,hash)).ok,true);
  assert.equal((await verifyPassword('wrong-password',salt,hash)).ok,false);
});
test('historical hashes retain 180000 verification; Workers rejection requires recovery', async () => {
  const hash=pbkdf2Sync('historical-password',Buffer.from(salt,'base64'),180000,32,'sha256').toString('base64');
  assert.equal((await verifyPassword('historical-password',salt,hash)).ok,true);
  assert.equal((await verifyPassword('wrong-password',salt,hash)).ok,false);
  const limited={importKey:crypto.subtle.importKey.bind(crypto.subtle),deriveBits:async p=>{assert.equal(p.iterations,180000);throw new Error('Pbkdf2 failed: iteration counts above 100000 are not supported (requested 180000).')}};
  assert.deepEqual(await verifyPassword('historical-password',salt,hash,limited),{ok:false,recoveryRequired:true});
  assert.deepEqual(await verifyPassword('anything',salt,'pbkdf2-sha256$1$bad'),{ok:false});
  await assert.rejects(verifyPassword('x',salt,hash,{...limited,deriveBits:async()=>{throw new Error('unrelated failure')}}),/unrelated failure/);
});
