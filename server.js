// server.js

import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const dgram     = require('dgram');
const http      = require('http');
const fs        = require('fs');
const WebSocket = require('ws');

const UDP_PORT  = 4444;
const HTTP_PORT = 8000;
const WS_PORT   = 8765;
const publicDir = path.join(__dirname, 'public');

const fieldsURL = pathToFileURL(path.join(__dirname, 'public', 'fields.js')).href;
const { default: fields } = await import(fieldsURL);



const readers = {
  Boolean:      (buf, off) => buf.readFloatLE(off) > 0,
  readFloatLE:  (buf, off) => buf.readFloatLE(off),
  readUInt8:    (buf, off) => buf.readUInt8(off),
  readInt8:     (buf, off) => buf.readInt8(off),
  readUInt16LE: (buf, off) => buf.readUInt16LE(off),
  readUInt32LE: (buf, off) => buf.readUInt32LE(off),
};

// ——— UDP → WebSocket ———
const wss = new WebSocket.Server({ port: WS_PORT }, () =>
  console.log(`WS on ws://localhost:${WS_PORT}`));
function broadcast(msg) {
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

const udp = dgram.createSocket('udp4');
udp.on('message', data => {
  // for each field, do data[ f.type ]( f.offset )
  const packet = {}
  for (let f of fields) {
    const fn = readers[f.type]
    packet[f.name] = fn
    ? fn(data, f.offset) : null;
  }
  broadcast(JSON.stringify(packet));
});
udp.bind(UDP_PORT, () =>
  console.log(`UDP on port ${UDP_PORT}`));

// ——— Static-file HTTP server ———
const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css' };
http.createServer((req, res) => {
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  let file    = path.join(publicDir, urlPath);
  let ext     = path.extname(file);

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(HTTP_PORT, () =>
  console.log(`HTTP on http://localhost:${HTTP_PORT}`));