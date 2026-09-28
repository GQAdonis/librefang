#!/usr/bin/env node
// Gate-only managed sidecar transport fault: lose one accepted admission response.

import { spawn } from 'node:child_process';
import { createWriteStream, writeFileSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';

const binaryArg = process.argv.indexOf('--sidecar-bin');
const sidecarBin = binaryArg >= 0
  ? process.argv[binaryArg + 1]
  : process.env.C05_REAL_SIDECAR_BIN;
if (!sidecarBin) {
  process.stderr.write('C05 sidecar proxy requires --sidecar-bin or C05_REAL_SIDECAR_BIN\n');
  process.exit(2);
}

let sidecar;
let sidecarPort;
let ready = false;
let readyBytes = '';
let faultArmed = process.env.C05_DROP_FIRST_ADMISSION === '1';
let faultReserved = false;
let launchToken;
let launchInput = '';
const server = createServer((incoming, outgoing) => {
    if (!sidecarPort) {
      outgoing.writeHead(503);
      outgoing.end('sidecar is starting');
      return;
    }
    const gateRequest = incoming.url?.startsWith('/__c05/');
    if (gateRequest && (!process.env.C05_GATE_TOKEN
      || incoming.headers.authorization !== `Bearer ${process.env.C05_GATE_TOKEN}`
      || !launchToken)) {
      outgoing.writeHead(403);
      outgoing.end('gate access refused');
      return;
    }
    const admission = incoming.method === 'POST'
      && incoming.url?.split('?', 1)[0] === '/api/uar/full-harness/v1/tasks';
    const faultCandidate = faultArmed && !faultReserved && admission;
    if (faultCandidate) faultReserved = true;

    const upstream = httpRequest({
      hostname: '127.0.0.1',
      port: sidecarPort,
      method: incoming.method,
      path: gateRequest ? incoming.url.slice('/__c05'.length) : incoming.url,
      headers: {
        ...incoming.headers,
        host: `127.0.0.1:${sidecarPort}`,
        ...(gateRequest ? {
          authorization: `Bearer ${launchToken}`,
          'x-uar-principal': process.env.C05_PRINCIPAL,
        } : {}),
      },
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
      if (process.env.C05_PROXY_ERROR_MARKER) {
        writeFileSync(process.env.C05_PROXY_ERROR_MARKER, `${error.message}\n`);
      }
      if (faultCandidate) faultReserved = false;
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end(error.message);
    });
    incoming.pipe(upstream);
  });
server.on('error', (error) => {
  process.stderr.write(`C05 sidecar proxy listener failed: ${error.message}\n`);
  sidecar?.kill();
});
server.listen(0, '127.0.0.1', () => {
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  if (process.env.C05_PROXY_ENV_MARKER) {
    writeFileSync(process.env.C05_PROXY_ENV_MARKER,
      `${process.env.UAR_PERSISTENCE__DATABASE_URL ?? 'unset'}\n`);
  }
  sidecar = spawn(sidecarBin, [], {
    env: {
      ...process.env,
      UAR_SERVICE_INSTANCE__RUNTIME_ENDPOINT: endpoint,
      UAR_SERVICE_INSTANCE__ADMINISTRATION_ENDPOINT: `${endpoint}/api/uar`,
      UAR_SERVICE_INSTANCE__MODELS_ENDPOINT: `${endpoint}/v1`,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  if (process.env.C05_SIDECAR_LOG) {
    sidecar.stderr.pipe(createWriteStream(process.env.C05_SIDECAR_LOG, { mode: 0o600 }));
  } else {
    sidecar.stderr.pipe(process.stderr);
  }
  process.stdin.on('data', chunk => {
    sidecar.stdin.write(chunk);
    if (!launchToken) {
      launchInput += chunk.toString('utf8');
      const newline = launchInput.indexOf('\n');
      if (newline >= 0) {
        launchToken = launchInput.slice(0, newline).trim();
        launchInput = '';
      }
    }
  });
  process.stdin.on('end', () => sidecar.stdin.end());
  sidecar.on('error', (error) => {
    process.stderr.write(`C05 sidecar proxy could not start sidecar: ${error.message}\n`);
    process.exitCode = 1;
    server.close();
  });
  sidecar.on('exit', (code, signal) => {
    server.close();
    if (!ready || code !== 0) process.exitCode = code || (signal ? 1 : 0);
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
    sidecarPort = Number(match[1]);
    process.stdout.write(`READY:${server.address().port}\n`);
  });
});
process.on('exit', () => {
  if (sidecar && sidecar.exitCode === null) sidecar.kill();
});
