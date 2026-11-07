'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Pure Node.js PNG encoder
function createPng(width, height, rgbaBuffer) {
  const IHDR = Buffer.alloc(13);
  IHDR.writeUInt32BE(width, 0);
  IHDR.writeUInt32BE(height, 4);
  IHDR[8] = 8;
  IHDR[9] = 6;
  IHDR[10] = 0;
  IHDR[11] = 0;
  IHDR[12] = 0;

  const rowSize = width * 4;
  const rawData = Buffer.alloc(height * (rowSize + 1));
  for (let y = 0; y < height; y++) {
    rawData[y * (rowSize + 1)] = 0;
    rgbaBuffer.copy(rawData, y * (rowSize + 1) + 1, y * rowSize, (y + 1) * rowSize);
  }

  const IDAT = zlib.deflateSync(rawData, { level: 9 });

  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[i] = c;
  }
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    makeChunk('IHDR', IHDR),
    makeChunk('IDAT', IDAT),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

// Decode PNG (colorType 2 RGB or 6 RGBA) to RGBA buffer
function decodePngToRgba(filePath) {
  const buf = fs.readFileSync(filePath);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const colorType = buf[25]; // 2=RGB, 6=RGBA

  const chunks = [];
  let pos = 8;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') chunks.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }

  const decompressed = zlib.inflateSync(Buffer.concat(chunks));
  const bpp = colorType === 6 ? 4 : 3;
  const rowBytes = w * bpp;
  const raw = Buffer.alloc(w * h * bpp);

  for (let y = 0; y < h; y++) {
    const filter = decompressed[y * (rowBytes + 1)];
    const srcRow = y * (rowBytes + 1) + 1;
    const dstRow = y * rowBytes;

    for (let x = 0; x < rowBytes; x++) {
      const rawByte = decompressed[srcRow + x];
      const a = x >= bpp ? raw[dstRow + x - bpp] : 0;
      const b = y > 0 ? raw[(y - 1) * rowBytes + x] : 0;
      const c = (x >= bpp && y > 0) ? raw[(y - 1) * rowBytes + x - bpp] : 0;

      let val = 0;
      if (filter === 0) val = rawByte;
      else if (filter === 1) val = (rawByte + a) & 0xff;
      else if (filter === 2) val = (rawByte + b) & 0xff;
      else if (filter === 3) val = (rawByte + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr = c;
        if (pa <= pb && pa <= pc) pr = a;
        else if (pb <= pc) pr = b;
        val = (rawByte + pr) & 0xff;
      }
      raw[dstRow + x] = val;
    }
  }

  // Convert to RGBA
  const rgba = Buffer.alloc(w * h * 4);
  if (colorType === 6) {
    raw.copy(rgba);
  } else {
    for (let i = 0; i < w * h; i++) {
      rgba[i * 4] = raw[i * 3];
      rgba[i * 4 + 1] = raw[i * 3 + 1];
      rgba[i * 4 + 2] = raw[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
  }

  return { width: w, height: h, rgba };
}

// Crop RGBA sub-rectangle
function cropRgba(src, srcW, x, y, w, h) {
  const dst = Buffer.alloc(w * h * 4);
  for (let cy = 0; cy < h; cy++) {
    const sy = y + cy;
    const srcOffset = (sy * srcW + x) * 4;
    const dstOffset = cy * w * 4;
    src.copy(dst, dstOffset, srcOffset, srcOffset + w * 4);
  }
  return dst;
}

// Bilinear scale RGBA buffer
function scaleRgba(src, srcW, srcH, dstW, dstH) {
  const dst = Buffer.alloc(dstW * dstH * 4);
  const xRatio = (srcW - 1) / Math.max(1, dstW - 1);
  const yRatio = (srcH - 1) / Math.max(1, dstH - 1);

  for (let y = 0; y < dstH; y++) {
    const srcY = y * yRatio;
    const yFloor = Math.floor(srcY);
    const yWeight = srcY - yFloor;
    const yCeil = Math.min(srcH - 1, yFloor + 1);

    for (let x = 0; x < dstW; x++) {
      const srcX = x * xRatio;
      const xFloor = Math.floor(srcX);
      const xWeight = srcX - xFloor;
      const xCeil = Math.min(srcW - 1, xFloor + 1);

      const idx00 = (yFloor * srcW + xFloor) * 4;
      const idx10 = (yFloor * srcW + xCeil) * 4;
      const idx01 = (yCeil * srcW + xFloor) * 4;
      const idx11 = (yCeil * srcW + xCeil) * 4;

      const dstIdx = (y * dstW + x) * 4;

      for (let c = 0; c < 4; c++) {
        const top = src[idx00 + c] * (1 - xWeight) + src[idx10 + c] * xWeight;
        const btm = src[idx01 + c] * (1 - xWeight) + src[idx11 + c] * xWeight;
        dst[dstIdx + c] = Math.round(top * (1 - yWeight) + btm * yWeight);
      }
    }
  }
  return dst;
}

// Remove background matching cream color with smooth alpha feathering
function removeCreamBackground(rgba, w, h) {
  const out = Buffer.from(rgba);
  // Target background color is around [251, 237, 231]
  const targetR = 251, targetG = 237, targetB = 231;

  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];

    const dr = r - targetR;
    const dg = g - targetG;
    const db = b - targetB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    if (dist < 18) {
      out[idx + 3] = 0; // completely transparent
    } else if (dist < 32) {
      // feathered edge
      const alpha = (dist - 18) / (32 - 18);
      out[idx + 3] = Math.round(alpha * 255);
    }
  }

  return out;
}

// Find tight bounding box of non-transparent pixels
function findTightBBox(rgba, w, h, minAlpha = 15) {
  let minX = w, maxX = 0, minY = h, maxY = 0, count = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = rgba[(y * w + x) * 4 + 3];
      if (a >= minAlpha) {
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (count === 0) return { x: 0, y: 0, w, h };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Fit cropped sprite into a square canvas (e.g. 128x128 or target size) with bottom alignment
function fitSprite(cropped, cropW, cropH, targetW, targetH, padding = 4) {
  const result = Buffer.alloc(targetW * targetH * 4, 0);
  const maxW = targetW - padding * 2;
  const maxH = targetH - padding * 2;

  const scale = Math.min(maxW / cropW, maxH / cropH);
  const scaledW = Math.round(cropW * scale);
  const scaledH = Math.round(cropH * scale);

  const scaled = scaleRgba(cropped, cropW, cropH, scaledW, scaledH);

  // Center horizontally, align to bottom
  const destX = Math.round((targetW - scaledW) / 2);
  const destY = targetH - padding - scaledH;

  for (let cy = 0; cy < scaledH; cy++) {
    for (let cx = 0; cx < scaledW; cx++) {
      const srcIdx = (cy * scaledW + cx) * 4;
      const dstIdx = ((destY + cy) * targetW + (destX + cx)) * 4;
      const a = scaled[srcIdx + 3] / 255;
      if (a > 0) {
        result[dstIdx] = scaled[srcIdx];
        result[dstIdx + 1] = scaled[srcIdx + 1];
        result[dstIdx + 2] = scaled[srcIdx + 2];
        result[dstIdx + 3] = scaled[srcIdx + 3];
      }
    }
  }

  return result;
}

console.log('Starting full high-resolution asset extraction...');

// Ensure directories exist
fs.mkdirSync('assets/sprites', { recursive: true });
fs.mkdirSync('assets/portraits', { recursive: true });

// 1. Process CEO Frog (image_cc982ba5.png) with glasses, scarf, brass pin
console.log('Processing CEO Frog artwork (image_cc982ba5.png)...');
const ceoSource = decodePngToRgba('public/assets/aistudio/image_cc982ba5.png');
const ceoTransparent = removeCreamBackground(ceoSource.rgba, ceoSource.width, ceoSource.height);

const ceoRegions = {
  portrait: [26, 72, 651, 440],
  idle: [702, 155, 398, 297],
  move: [1092, 145, 398, 307],
  working: [38, 512, 512, 410],
  review: [575, 581, 419, 315],
  relaxing: [1052, 598, 418, 288]
};

const ceoSprites = {};
for (const [key, [rx, ry, rw, rh]] of Object.entries(ceoRegions)) {
  const cropped = cropRgba(ceoTransparent, ceoSource.width, rx, ry, rw, rh);
  const bbox = findTightBBox(cropped, rw, rh);
  const tight = cropRgba(cropped, rw, bbox.x, bbox.y, bbox.w, bbox.h);

  // Target sprite size 128x128 for rich HD rendering on high-DPI
  const fitted = fitSprite(tight, bbox.w, bbox.h, 128, 128);
  ceoSprites[key] = fitted;

  fs.writeFileSync(`assets/sprites/bullfrog-${key}.png`, createPng(128, 128, fitted));
}
console.log('Saved CEO sprites to assets/sprites/bullfrog-*.png');

// 2. Process 5 Characters from image_67e6dc04.png
console.log('Processing 5-character sprite sheet (image_67e6dc04.png)...');
const sheetSource = decodePngToRgba('public/assets/aistudio/image_67e6dc04.png');

const speciesList = ['bullfrog', 'treefrog', 'capybara', 'lunamoth', 'octopus'];
const colWidth = sheetSource.width / 6;   // 256
const rowHeight = sheetSource.height / 5; // 204.8

const allSpeciesSprites = {};

for (let row = 0; row < 5; row++) {
  const species = speciesList[row];
  allSpeciesSprites[species] = {};

  // Columns: 0:idle, 1:move, 2:back, 3:working, 4:review, 5:relaxing
  const colMap = {
    idle: 0,
    move: 1,
    back: 2,
    working: 3,
    review: 4,
    relaxing: 5
  };

  for (const [stateName, col] of Object.entries(colMap)) {
    const cx = Math.floor(col * colWidth);
    const cy = Math.floor(row * rowHeight);
    const cw = Math.floor(colWidth);
    const ch = Math.floor(rowHeight);

    const cropped = cropRgba(sheetSource.rgba, sheetSource.width, cx, cy, cw, ch);
    const bbox = findTightBBox(cropped, cw, ch);
    const tight = cropRgba(cropped, cw, bbox.x, bbox.y, bbox.w, bbox.h);

    const fitted = fitSprite(tight, bbox.w, bbox.h, 128, 128);
    allSpeciesSprites[species][stateName] = fitted;

    // For bullfrog, prefer the specific CEO version with glasses & scarf from image_cc982ba5
    if (species === 'bullfrog' && ceoSprites[stateName]) {
      allSpeciesSprites[species][stateName] = ceoSprites[stateName];
    } else {
      fs.writeFileSync(`assets/sprites/${species}-${stateName}.png`, createPng(128, 128, fitted));
    }
  }
}
console.log('Extracted all 5 species states to assets/sprites/*.png');

// 3. Process Lineup Portraits from image_f30db12f.png
console.log('Processing Colleague Portraits from lineup banner (image_f30db12f.png)...');
const lineupSource = decodePngToRgba('public/assets/aistudio/image_f30db12f.png');
// Remove background: lineup background is warm grey/olive [201, 201, 185]
const lineupClean = Buffer.from(lineupSource.rgba);
for (let i = 0; i < lineupSource.width * lineupSource.height; i++) {
  const idx = i * 4;
  const r = lineupClean[idx], g = lineupClean[idx + 1], b = lineupClean[idx + 2];
  const dr = r - 200, dg = g - 200, db = b - 186;
  const dist = Math.sqrt(dr * dr + dg * dg + db * db);
  if (dist < 22) {
    lineupClean[idx + 3] = 0;
  } else if (dist < 36) {
    lineupClean[idx + 3] = Math.round(((dist - 22) / 14) * 255);
  }
}

// 5 portraits in a row: 2172 / 5 = ~434px per slot
const rosterIds = ['emp_ceo', 'emp_miki', 'emp_karina', 'emp_son', 'emp_yoo'];
for (let i = 0; i < 5; i++) {
  const slotX = Math.floor(i * (lineupSource.width / 5));
  const slotW = Math.floor(lineupSource.width / 5);
  const cropped = cropRgba(lineupClean, lineupSource.width, slotX, 0, slotW, lineupSource.height);
  const bbox = findTightBBox(cropped, slotW, lineupSource.height);
  const tight = cropRgba(cropped, slotW, bbox.x, bbox.y, bbox.w, bbox.h);

  // If emp_ceo, use the large detailed portrait with glasses & scarf
  let fitted;
  if (i === 0 && ceoSprites.portrait) {
    fitted = ceoSprites.portrait;
  } else {
    fitted = fitSprite(tight, bbox.w, bbox.h, 128, 128);
  }

  fs.writeFileSync(`assets/portraits/${rosterIds[i]}.png`, createPng(128, 128, fitted));
}
console.log('Saved 5 colleague portraits to assets/portraits/*.png');

// 4. Generate Master 1024x576 Office Background from image_c108544d.png
console.log('Generating master office background (1024x576) from image_c108544d.png...');
const officeSource = decodePngToRgba('public/assets/aistudio/image_c108544d.png');
// Scale from 1671x941 directly to 1024x576
const officeBackground = scaleRgba(officeSource.rgba, officeSource.width, officeSource.height, 1024, 576);
fs.writeFileSync('assets/master-office-background.png', createPng(1024, 576, officeBackground));
console.log('Saved assets/master-office-background.png (1024x576)');

// 5. Build 24-frame HD Atlas PNG & JSON for each species
console.log('Building 24-frame HD Atlases for all 5 species...');
const frameCounts = { idle: 4, move: 6, working: 6, review_request: 4, relaxing: 4 };

for (const species of speciesList) {
  const atlasWidth = 128 * 6; // 768
  const atlasHeight = 128 * 4; // 512
  const atlasBuffer = Buffer.alloc(atlasWidth * atlasHeight * 4, 0);

  const sprites = allSpeciesSprites[species];
  const entries = [];
  let index = 0;

  for (const state of Object.keys(frameCounts)) {
    const count = frameCounts[state];
    // Map state name to sprite key
    const spriteKey = state === 'review_request' ? 'review' : state;
    const baseSprite = sprites[spriteKey] || sprites.idle;

    for (let f = 0; f < count; f++) {
      const col = index % 6;
      const row = Math.floor(index / 6);
      const ax = col * 128;
      const ay = row * 128;

      // Subtle breathing / motion offset per frame
      let dy = 0;
      if (state === 'idle') {
        if (f === 1 || f === 2) dy = -1;
      } else if (state === 'move') {
        const hops = [0, -3, -6, -4, -1, 0];
        dy = hops[f];
      } else if (state === 'working') {
        if (f % 2 === 1) dy = 1;
      }

      // Draw baseSprite with dy into atlasBuffer
      for (let cy = 0; cy < 128; cy++) {
        const targetY = ay + cy + dy;
        if (targetY < 0 || targetY >= atlasHeight) continue;
        for (let cx = 0; cx < 128; cx++) {
          const srcIdx = (cy * 128 + cx) * 4;
          const a = baseSprite[srcIdx + 3] / 255;
          if (a > 0) {
            const dstIdx = (targetY * atlasWidth + (ax + cx)) * 4;
            atlasBuffer[dstIdx] = baseSprite[srcIdx];
            atlasBuffer[dstIdx + 1] = baseSprite[srcIdx + 1];
            atlasBuffer[dstIdx + 2] = baseSprite[srcIdx + 2];
            atlasBuffer[dstIdx + 3] = baseSprite[srcIdx + 3];
          }
        }
      }

      entries.push({
        state,
        direction: 'south',
        frame: f,
        duration: state === 'move' ? 120 : state === 'working' ? 160 : 200,
        x: ax,
        y: ay,
        w: 128,
        h: 128,
        pivot: [64, 118],
        occlusionGroup: 'actor'
      });

      index++;
    }
  }

  fs.writeFileSync(`assets/${species}-atlas.png`, createPng(atlasWidth, atlasHeight, atlasBuffer));
  fs.writeFileSync(`assets/${species}-frames.json`, JSON.stringify(entries, null, 2), 'utf-8');
  console.log(`Saved assets/${species}-atlas.png and assets/${species}-frames.json (24 frames)`);
}

console.log('All authentic character assets successfully processed!');
