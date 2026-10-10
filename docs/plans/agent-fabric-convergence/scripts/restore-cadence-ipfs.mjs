// Restore the authenticated encrypted history into a NEW directory; never mutate a live run.
import { promises as fs, createWriteStream, createReadStream } from 'node:fs';
import path from 'node:path';
import { createHash, createDecipheriv, randomUUID } from 'node:crypto';
import { createGunzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';

const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
for (const name of ['--manifest', '--sha256', '--key-file', '--out']) {
  if (!args.includes(name) || !option(name)) throw new Error('Required option: ' + name);
}
const output = path.resolve(option('--out'));
try { await fs.stat(output); throw new Error('Restore destination already exists. Choose a new directory.'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const response = await fetch(option('--manifest'));
if (!response.ok) throw new Error('Manifest HTTP ' + response.status);
const bytes = Buffer.from(await response.arrayBuffer());
if (createHash('sha256').update(bytes).digest('hex') !== option('--sha256')) throw new Error('Manifest checksum differs from the repository reference');
const manifest = JSON.parse(bytes);
if (manifest.schemaVersion !== 1) throw new Error('Unsupported backup manifest');
const key = Buffer.from((await fs.readFile(option('--key-file'), 'utf8')).trim(), 'hex');
if (key.length !== 32) throw new Error('The recovery key must contain 32 bytes encoded as hexadecimal');
await fs.mkdir(output, { recursive: true, mode: 0o700 });
const downloads = path.join(output, '.download'); await fs.mkdir(downloads, {mode: 0o700});
async function digest(file) {
  const hash = createHash('sha256'); for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
function destination(relative) {
  const file = path.resolve(output, relative);
  if (path.isAbsolute(relative) || !file.startsWith(output + path.sep)) throw new Error('Backup path leaves the restore directory');
  return file;
}
for (const item of manifest.files) {
  if (item.algorithm !== 'aes-256-gcm' || !['gzip', 'none'].includes(item.compression)) throw new Error('Unsupported encrypted record');
  const encrypted = path.join(downloads, randomUUID());
  const request = await fetch(new URL(item.name, option('--manifest')));
  if (!request.ok) throw new Error('Download HTTP ' + request.status + ': ' + item.name);
  await pipeline(request.body, createWriteStream(encrypted, {mode: 0o600}));
  if ((await fs.stat(encrypted)).size !== item.bytes || await digest(encrypted) !== item.sha256) throw new Error('Encrypted file checksum differs: ' + item.name);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(item.nonce, 'hex'));
  decipher.setAuthTag(Buffer.from(item.tag, 'hex'));
  const plaintext = path.join(downloads, randomUUID());
  await pipeline(createReadStream(encrypted), decipher, ...(item.compression === 'gzip' ? [createGunzip()] : []), createWriteStream(plaintext, {mode: 0o600}));
  if ((await fs.stat(plaintext)).size !== item.plainBytes || await digest(plaintext) !== item.plainSha256) throw new Error('Restored file checksum differs: ' + item.name);
  if (item.restorePath === '@supporting-records') {
    const {records} = JSON.parse(await fs.readFile(plaintext, 'utf8'));
    for (const record of records) {
      const target = destination(record.path);
      await fs.mkdir(path.dirname(target), {recursive: true, mode: 0o700});
      await fs.writeFile(target, Buffer.from(record.base64, 'base64'), {flag: 'wx', mode: 0o600});
    }
    await fs.unlink(plaintext);
  } else {
    const target = destination(item.restorePath);
    await fs.mkdir(path.dirname(target), {recursive: true, mode: 0o700});
    await fs.rename(plaintext, target);
  }
  await fs.unlink(encrypted);
  console.log('Restored ' + item.restorePath);
}
await fs.rmdir(downloads);
console.log('Restored to ' + output + '. Live Cadence clocks and counters were not modified.');
