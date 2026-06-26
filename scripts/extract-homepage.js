#!/usr/bin/env node
// Reads /Users/anujmahajan/Downloads/xevia-homepage.html, extracts all inline
// base64 images to /public/images/home/, rewrites the src attributes, and emits
// just the <body> markup to /Users/anujmahajan/xevia-diamonds/tmp/homepage-body.html
// Also emits the <style> block to /Users/anujmahajan/xevia-diamonds/tmp/homepage.css
// so we can splice the result into views/home.njk cleanly.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = '/Users/anujmahajan/Downloads/xevia-homepage.html';
const OUT_IMG_DIR = path.join(__dirname, '..', 'public', 'images', 'home');
const OUT_TMP_DIR = path.join(__dirname, '..', 'tmp');
fs.mkdirSync(OUT_IMG_DIR, { recursive: true });
fs.mkdirSync(OUT_TMP_DIR, { recursive: true });

const html = fs.readFileSync(SRC, 'utf8');

// 1. Extract style block
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const css = styleMatch ? styleMatch[1] : '';
fs.writeFileSync(path.join(OUT_TMP_DIR, 'homepage.css'), css);

// 2. Extract body markup
const bodyMatch = html.match(/<body>([\s\S]*?)<\/body>/);
let body = bodyMatch ? bodyMatch[1] : '';

// 3. Pull every data:image/...;base64,... and dump as file
const imgRegex = /src="data:image\/(\w+);base64,([^"]+)"/g;
const seen = new Map();
let counter = 0;
body = body.replace(imgRegex, (_, ext, b64) => {
  const hash = crypto.createHash('md5').update(b64).digest('hex').slice(0, 8);
  if (seen.has(hash)) return `src="${seen.get(hash)}"`;
  counter += 1;
  const filename = `home-${String(counter).padStart(2, '0')}-${hash}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const filePath = path.join(OUT_IMG_DIR, filename);
  fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
  const publicUrl = `/images/home/${filename}`;
  seen.set(hash, publicUrl);
  return `src="${publicUrl}"`;
});

fs.writeFileSync(path.join(OUT_TMP_DIR, 'homepage-body.html'), body);
console.log(`Extracted ${counter} unique images → public/images/home/`);
console.log(`Body markup → tmp/homepage-body.html (${body.length} chars)`);
console.log(`CSS → tmp/homepage.css (${css.length} chars)`);
