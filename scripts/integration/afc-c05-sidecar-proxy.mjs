#!/usr/bin/env node
// Gate-only managed sidecar transport fault: lose one accepted admission response.

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';

const binaryArg = process.argv.indexOf('--sidecar-bin');
const sidecarBin = binaryArg >= 0
  ? process.argv[binaryArg + 1]
  : process.env.C05_REAL_SIDECAR_BIN;
if (!sidecarBin) {
  process.stderr.write('C05 sidecar proxy requires --sidecar-bin or C05_REAL_SIDECAR_BIN\n');
  process.exit(2);
}

const sidecar = spawn(sidecarBin, [], {
  env: process.env,
  stdio: ['pipe', 'pipe', 'inherit'],
});
process.stdin.pipe(sidecar.stdin);

let server;
let ready = false;
let readyBytes = '';
let faultArmed = process.env.C05_DROP_FIRST_ADMISSION === '1';
let faultReserved = false;

sidecar.on('error', (error) => {
  process.stderr.write(`C05 sidecar proxy could not start sidecar: ${error.message}\n`);
  process.exitCode = 1;
  server?.close();
});
sidecar.on('exit', (code, signal) => {
  server?.close();
  if (!ready || code !== 0) {
    process.exitCode = code || (signal ? 1 : 0);
  }
});
process.on('exit', () => {
  if (sidecar.exitCode === null) sidecar.kill();
});

sidecar.stdout.on('data', (chunk) => {
  if (ready) return;
  readyBytes += chunk.toString('utf8');
  const newline = readyBytes.indexOf('\n');
  if (newline < 0) {
    if (readyBytes.length > 1024) sidecar.kill();
    return;
  }
  const match = /^READY:(\d+)\r?$/.exec(readyBytes.slice(0, newline));
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 65535) {
    process.stderr.write('C05 sidecar proxy received an invalid READY line\n');
    sidecar.kill();
    return;
  }
  ready = true;
  const sidecarPort = Number(match[1]);
  server = createServer((incoming, outgoing) => {
    const admission = incoming.method === 'POST'
      && incoming.url?.split('?', 1)[0] === '/api/uar/full-harness/v1/tasks';
    const faultCandidate = faultArmed && !faultReserved && admission;
    if (faultCandidate) faultReserved = true;

    const upstream = httpRequest({
      hostname: '127.0.0.1',
      port: sidecarPort,
      method: incoming.method,
      path: incoming.url,
      headers: { ...incoming.headers, host: `127.0.0.1:${sidecarPort}` },
    }, (response) => {
      if (faultCandidate && response.statusCode >= 200 && response.statusCode < 300) {
        faultArmed = false;
        response.resume();
        response.on('end', () => {
          const marker = process.env.C05_PROXY_DROP_MARKER;
          if (marker) writeFileSync(marker, 'dropped accepted admission response\n');
          outgoing.destroy();
        });
        return;
      }
      if (faultCandidate) faultReserved = false;
      outgoing.writeHead(response.statusCode, response.headers);
      response.pipe(outgoing);
    });
    upstream.on('error', (error) => {
      if (faultCandidate) faultReserved = false;
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end(error.message);
    });
    incoming.pipe(upstream);
  });
  server.on('error', (error) => {
    process.stderr.write(`C05 sidecar proxy listener failed: ${error.message}\n`);
    sidecar.kill();
  });
  server.listen(0, '127.0.0.1', () => {
    process.stdout.write(`READY:${server.address().port}\n`);
  });
});
