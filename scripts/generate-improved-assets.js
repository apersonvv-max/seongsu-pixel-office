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

// Minimal pixel buffer drawing context
class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = Buffer.alloc(width * height * 4, 0);
  }

  parseColor(color) {
    if (typeof color === 'string') {
      if (color.startsWith('#')) {
        let hex = color.slice(1);
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('') + 'ff';
        else if (hex.length === 4) hex = hex.split('').map(c => c + c).join('');
        else if (hex.length === 6) hex = hex + 'ff';
        const num = parseInt(hex, 16);
        return [
          (num >>> 24) & 0xff,
          (num >>> 16) & 0xff,
          (num >>> 8) & 0xff,
          (num & 0xff) / 255
        ];
      }
      if (color.startsWith('rgba')) {
        const parts = color.match(/rgba?\(([^)]+)\)/)[1].split(',').map(s => parseFloat(s.trim()));
        return [parts[0], parts[1], parts[2], parts[3] !== undefined ? parts[3] : 1];
      }
    }
    return [0, 0, 0, 1];
  }

  setPixel(x, y, r, g, b, a = 1) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || a <= 0) return;
    const idx = (y * this.width + x) * 4;
    if (a >= 1) {
      this.buffer[idx] = r;
      this.buffer[idx + 1] = g;
      this.buffer[idx + 2] = b;
      this.buffer[idx + 3] = 255;
    } else {
      const dstA = this.buffer[idx + 3] / 255;
      const outA = a + dstA * (1 - a);
      if (outA > 0) {
        this.buffer[idx] = Math.round((r * a + this.buffer[idx] * dstA * (1 - a)) / outA);
        this.buffer[idx + 1] = Math.round((g * a + this.buffer[idx + 1] * dstA * (1 - a)) / outA);
        this.buffer[idx + 2] = Math.round((b * a + this.buffer[idx + 2] * dstA * (1 - a)) / outA);
        this.buffer[idx + 3] = Math.round(outA * 255);
      }
    }
  }

  rect(x, y, w, h, color) {
    const [r, g, b, a] = this.parseColor(color);
    for (let cy = y; cy < y + h; cy++) {
      for (let cx = x; cx < x + w; cx++) {
        this.setPixel(cx, cy, r, g, b, a);
      }
    }
  }

  box(x, y, w, h, fill, stroke) {
    if (stroke) this.rect(x, y, w, h, stroke);
    if (fill) this.rect(x + 1, y + 1, w - 2, h - 2, fill);
  }

  ellipse(cx, cy, rx, ry, color) {
    const [r, g, b, a] = this.parseColor(color);
    for (let dy = -ry; dy <= ry; dy++) {
      const width = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))));
      for (let dx = -width; dx <= width; dx++) {
        this.setPixel(cx + dx, cy + dy, r, g, b, a);
      }
    }
  }

  line(x1, y1, x2, y2, color, size = 1) {
    const [r, g, b, a] = this.parseColor(color);
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
    for (let i = 0; i <= n; i++) {
      const t = n ? i / n : 0;
      const x = Math.round(x1 + (x2 - x1) * t);
      const y = Math.round(y1 + (y2 - y1) * t);
      for (let sx = 0; sx < size; sx++) {
        for (let sy = 0; sy < size; sy++) {
          this.setPixel(x + sx, y + sy, r, g, b, a);
        }
      }
    }
  }

  drawImage(sourceCanvas, dx, dy) {
    for (let sy = 0; sy < sourceCanvas.height; sy++) {
      for (let sx = 0; sx < sourceCanvas.width; sx++) {
        const srcIdx = (sy * sourceCanvas.width + sx) * 4;
        const a = sourceCanvas.buffer[srcIdx + 3] / 255;
        if (a > 0) {
          this.setPixel(
            dx + sx,
            dy + sy,
            sourceCanvas.buffer[srcIdx],
            sourceCanvas.buffer[srcIdx + 1],
            sourceCanvas.buffer[srcIdx + 2],
            a
          );
        }
      }
    }
  }

  toPngBuffer() {
    return createPng(this.width, this.height, this.buffer);
  }
}

// Palette for the Sage Forest Frog CEO
const P = {
  // Sage Frog Skin
  sageDark: '#2a3d24',    // dark contour & deep shadow
  sageLine: '#3a5233',    // contour line
  sageShadow: '#57724c',  // shadow tone
  sageBase: '#7b986c',    // primary sage green
  sageMid: '#90ad81',     // light sage
  sageLight: '#a9c79a',   // highlight tone
  sageBright: '#c4e0b5',  // specular accent

  // Cream Belly / Throat
  bellyDark: '#c9be9f',
  bellyBase: '#e7ddc4',
  bellyLight: '#f6f0df',

  // Glasses
  frameEdge: '#111413',
  frameBase: '#1d2220',
  frameHi: '#38423e',
  glassReflection: '#dceee9',

  // Eyes
  irisRing: '#cfaf4f',
  pupil: '#161917',
  eyeGlint: '#ffffff',

  // Scarf
  scarfDark: '#17305e',
  scarfShadow: '#22437e',
  scarfBase: '#2d58a5',
  scarfHi: '#4d7dcf',
  scarfBright: '#78a2eb',

  // Brass Pin
  pinShadow: '#9c7924',
  pinBase: '#d4af37',
  pinHi: '#fae373',

  // Executive Props
  penGold: '#d6b34b',
  penBlack: '#2b2d2f',
  paperDark: '#c9bfae',
  paperBase: '#f4ede1',
  paperSeal: '#b83b32',
  steam: '#ffffff88',
  teaCup: '#eae3d5',
  teaRim: '#baa892'
};

// Draw a single 64x64 frame for CEO
function drawCeoFrame(state, frameNum) {
  const c = new PixelCanvas(64, 64);
  const cx = 32;

  // Frame timing offsets
  const isMove = state === 'move';
  const isWork = state === 'working';
  const isReview = state === 'review_request';
  const isRest = state === 'relaxing';
  const isIdle = state === 'idle';

  // State-specific vertical oscillation / bounce
  let bodyY = 0;
  let breathY = 0;
  let scarfSway = 0;
  let blink = false;
  let eyeLook = 0; // -1 left, 0 center, 1 right

  if (isIdle) {
    // 4 frames: calm dignified breathing
    if (frameNum === 1) breathY = -1;
    if (frameNum === 2) breathY = -1;
    if (frameNum === 3) blink = true;
  } else if (isMove) {
    // 6 frames: smooth hopping stride
    const hops = [0, -3, -5, -4, -1, 0];
    bodyY = hops[frameNum];
    scarfSway = [0, -1, -2, -1, 1, 0][frameNum];
  } else if (isWork) {
    // 6 frames: reading, writing, signing document
    if (frameNum === 1 || frameNum === 2) bodyY = 1; // leaning into desk
    if (frameNum === 3 || frameNum === 4) bodyY = 1;
    if (frameNum === 2 || frameNum === 3) eyeLook = 1;
  } else if (isReview) {
    // 4 frames: presenting approval folder, attentive nod
    if (frameNum === 1 || frameNum === 2) eyeLook = 1;
    if (frameNum === 2) breathY = -1;
  } else if (isRest) {
    // 4 frames: sipping tea, relaxing
    if (frameNum === 1 || frameNum === 2) bodyY = -1;
    if (frameNum === 2) blink = true;
  }

  const baseY = 34 + bodyY + breathY;

  // 1. Lower Haunches & Feet (Ground contact at Y = 58)
  // Left foot
  if (isMove && (frameNum === 1 || frameNum === 2)) {
    // extended in leap
    c.ellipse(19, 56 + bodyY, 6, 2, P.sageDark);
    c.ellipse(19, 55 + bodyY, 5, 2, P.sageBase);
    c.ellipse(45, 56 + bodyY, 6, 2, P.sageDark);
    c.ellipse(45, 55 + bodyY, 5, 2, P.sageBase);
  } else {
    // firmly grounded
    c.ellipse(18, 57, 7, 2, P.sageDark);
    c.ellipse(18, 56, 6, 2, P.sageShadow);
    c.ellipse(18, 55, 5, 1, P.sageBase);
    // 3 toe pads
    c.rect(13, 56, 3, 2, P.sageMid);
    c.rect(17, 57, 3, 2, P.sageMid);
    c.rect(21, 56, 3, 2, P.sageMid);

    // Right foot
    c.ellipse(46, 57, 7, 2, P.sageDark);
    c.ellipse(46, 56, 6, 2, P.sageShadow);
    c.ellipse(46, 55, 5, 1, P.sageBase);
    c.rect(41, 56, 3, 2, P.sageMid);
    c.rect(45, 57, 3, 2, P.sageMid);
    c.rect(49, 56, 3, 2, P.sageMid);
  }

  // Folded haunches / thigh curves
  c.ellipse(19, baseY + 14, 9, 7, P.sageDark);
  c.ellipse(19, baseY + 13, 8, 6, P.sageShadow);
  c.ellipse(19, baseY + 12, 6, 5, P.sageBase);

  c.ellipse(45, baseY + 14, 9, 7, P.sageDark);
  c.ellipse(45, baseY + 13, 8, 6, P.sageShadow);
  c.ellipse(45, baseY + 12, 6, 5, P.sageBase);

  // 2. Torso and Cream Belly
  c.ellipse(cx, baseY + 10, 16, 12, P.sageDark);
  c.ellipse(cx, baseY + 9, 15, 11, P.sageShadow);
  c.ellipse(cx, baseY + 8, 14, 10, P.sageBase);
  c.ellipse(cx, baseY + 6, 12, 8, P.sageMid);

  // Cream belly & chest bib
  c.ellipse(cx, baseY + 9, 10, 8, P.bellyDark);
  c.ellipse(cx, baseY + 8, 9, 7, P.bellyBase);
  c.ellipse(cx, baseY + 6, 7, 5, P.bellyLight);

  // 3. Head & Cheek Silhouette (Distinctive elegant Sage treefrog shape)
  const headY = baseY - 6;
  // Head outer mass
  c.ellipse(cx, headY + 3, 18, 11, P.sageDark);
  c.ellipse(cx, headY + 2, 17, 10, P.sageShadow);
  c.ellipse(cx, headY + 1, 16, 9, P.sageBase);
  c.ellipse(cx, headY - 1, 14, 7, P.sageMid);
  c.ellipse(cx, headY - 3, 11, 4, P.sageLight);

  // Throat cream fold
  c.ellipse(cx, headY + 8, 11, 4, P.bellyBase);
  c.ellipse(cx, headY + 7, 9, 3, P.bellyLight);

  // 4. Perched Eye Domes (Top of Head)
  // Left eye dome
  c.ellipse(22, headY - 7, 7, 7, P.sageDark);
  c.ellipse(22, headY - 8, 6, 6, P.sageShadow);
  c.ellipse(22, headY - 9, 5, 5, P.sageBase);
  c.ellipse(22, headY - 10, 4, 3, P.sageLight);

  // Right eye dome
  c.ellipse(42, headY - 7, 7, 7, P.sageDark);
  c.ellipse(42, headY - 8, 6, 6, P.sageShadow);
  c.ellipse(42, headY - 9, 5, 5, P.sageBase);
  c.ellipse(42, headY - 10, 4, 3, P.sageLight);

  // 5. Glasses & Eyes
  // Eyes themselves
  for (const ex of [22, 42]) {
    if (blink) {
      // Dignified calm blink line
      c.line(ex - 4, headY - 8, ex + 4, headY - 8, P.sageDark, 2);
      c.line(ex - 3, headY - 9, ex + 3, headY - 9, P.sageLine, 1);
    } else {
      // Sclera / Golden Amber Iris
      c.ellipse(ex, headY - 8, 4, 4, P.irisRing);
      // Pupil (large expressive obsidian)
      const pupilShift = eyeLook;
      c.ellipse(ex + pupilShift, headY - 8, 3, 3, P.pupil);
      // Bright glint
      c.setPixel(ex - 1 + pupilShift, headY - 10, 255, 255, 255, 1);
      c.setPixel(ex + pupilShift, headY - 10, 255, 255, 255, 0.8);
    }
  }

  // Thick Black Horn-Rimmed Glasses Frames
  // Left frame box
  c.box(16, headY - 13, 13, 10, null, P.frameEdge);
  c.box(17, headY - 12, 11, 8, null, P.frameBase);
  c.setPixel(18, headY - 12, 56, 66, 62, 1); // corner highlight

  // Right frame box
  c.box(36, headY - 13, 13, 10, null, P.frameEdge);
  c.box(37, headY - 12, 11, 8, null, P.frameBase);
  c.setPixel(38, headY - 12, 56, 66, 62, 1);

  // Glasses Bridge connecting the two lenses
  c.line(28, headY - 9, 36, headY - 9, P.frameEdge, 2);
  c.line(29, headY - 9, 35, headY - 9, P.frameBase, 1);

  // Elegant subtle diagonal lens reflection glint
  if (!blink) {
    c.line(18, headY - 6, 20, headY - 11, P.glassReflection, 1);
    c.line(38, headY - 6, 40, headY - 11, P.glassReflection, 1);
  }

  // Mouth / smile line
  c.line(24, headY + 5, 40, headY + 5, P.sageDark, 1);
  c.setPixel(23, headY + 4, 42, 61, 36, 1);
  c.setPixel(41, headY + 4, 42, 61, 36, 1);

  // 6. Cobalt Silk Scarf & Brass Pin
  const scarfY = headY + 9;
  // Scarf collar band around neck
  c.box(18, scarfY, 28, 7, P.scarfBase, P.scarfDark);
  c.line(20, scarfY + 1, 44, scarfY + 1, P.scarfHi, 1);
  c.line(22, scarfY + 2, 42, scarfY + 2, P.scarfBright, 1);

  // Scarf Knot (layered folds)
  const knotX = 29 + scarfSway;
  c.box(knotX, scarfY + 3, 9, 8, P.scarfBase, P.scarfDark);
  c.line(knotX + 2, scarfY + 4, knotX + 6, scarfY + 4, P.scarfHi, 1);
  c.line(knotX + 3, scarfY + 5, knotX + 6, scarfY + 7, P.scarfShadow, 1);

  // Scarf draped tails
  const tailX = knotX + 1;
  c.box(tailX, scarfY + 9, 7, 8, P.scarfBase, P.scarfDark);
  c.line(tailX + 1, scarfY + 10, tailX + 4, scarfY + 15, P.scarfHi, 1);
  c.line(tailX + 5, scarfY + 11, tailX + 5, scarfY + 16, P.scarfShadow, 1);

  // Second fluttering tail
  c.box(tailX + 6, scarfY + 7, 5, 7, P.scarfBase, P.scarfDark);
  c.line(tailX + 7, scarfY + 8, tailX + 9, scarfY + 12, P.scarfHi, 1);

  // Small Brass Pin on Scarf Lapel (gleaming gold with center highlight)
  const pinX = 25;
  const pinY = scarfY + 2;
  c.box(pinX, pinY, 4, 4, P.pinBase, P.pinShadow);
  c.setPixel(pinX + 1, pinY + 1, 250, 227, 115, 1); // brass shine
  c.setPixel(pinX + 2, pinY + 1, 255, 255, 255, 1); // specular spark

  // 7. Arms and Props per State
  if (isWork) {
    // Working: Leaning over executive document with brass fountain pen
    // Left arm holding paper corner
    c.ellipse(19, baseY + 6, 4, 8, P.sageDark);
    c.ellipse(19, baseY + 6, 3, 7, P.sageBase);
    c.rect(21, baseY + 12, 4, 3, P.sageMid); // hand

    // Document docket on desk in front
    c.box(24, baseY + 8, 16, 12, P.paperBase, P.paperDark);
    c.line(26, baseY + 11, 36, baseY + 11, P.paperDark, 1);
    c.line(26, baseY + 13, 34, baseY + 13, P.paperDark, 1);
    c.line(26, baseY + 15, 37, baseY + 15, P.paperDark, 1);
    c.setPixel(35, baseY + 17, 184, 59, 50, 1); // red wax stamp

    // Right arm holding brass fountain pen
    const penWiggle = frameNum % 2;
    c.ellipse(45, baseY + 6, 4, 8, P.sageDark);
    c.ellipse(45, baseY + 6, 3, 7, P.sageBase);
    c.rect(41, baseY + 11, 4, 3, P.sageMid); // hand holding pen

    // Brass fountain pen
    c.line(42, baseY + 10, 36 - penWiggle, baseY + 16, P.penGold, 2);
    c.setPixel(35 - penWiggle, baseY + 17, 30, 30, 30, 1); // pen nib
  } else if (isReview) {
    // Review: Presenting formal approval dossier/folder with red seal
    // Folder held between hands
    c.box(25, baseY + 4, 18, 14, '#6b4b32', '#442d1b'); // leather portfolio
    c.box(27, baseY + 6, 14, 10, P.paperBase, P.paperDark);
    c.line(29, baseY + 8, 38, baseY + 8, P.paperDark, 1);
    c.line(29, baseY + 10, 36, baseY + 10, P.paperDark, 1);
    // Vermilion approval stamp
    c.box(33, baseY + 11, 5, 4, P.paperSeal, '#801f19');
    c.setPixel(35, baseY + 12, 255, 230, 200, 1);

    // Left & Right hands supporting folder
    c.rect(23, baseY + 8, 4, 5, P.sageBase);
    c.rect(41, baseY + 8, 4, 5, P.sageBase);
  } else if (isRest) {
    // Relaxing: Holding warm porcelain teacup with rising tea steam
    // Hands holding cup
    c.rect(27, baseY + 9, 3, 4, P.sageBase);
    c.rect(37, baseY + 9, 3, 4, P.sageBase);

    // Porcelain cup
    c.box(29, baseY + 8, 9, 8, P.teaCup, P.teaRim);
    c.line(30, baseY + 7, 37, baseY + 7, '#795b3b', 1); // warm tea surface

    // Steam wisps
    if (frameNum === 1 || frameNum === 2) {
      c.setPixel(32, baseY + 4, 255, 255, 255, 0.7);
      c.setPixel(33, baseY + 3, 255, 255, 255, 0.6);
      c.setPixel(35, baseY + 1, 255, 255, 255, 0.5);
    } else {
      c.setPixel(34, baseY + 4, 255, 255, 255, 0.7);
      c.setPixel(35, baseY + 2, 255, 255, 255, 0.5);
    }
  } else {
    // Idle / Moving: Hands neatly resting or swinging with posture
    const handY = baseY + 7;
    c.ellipse(19, handY, 4, 7, P.sageDark);
    c.ellipse(19, handY, 3, 6, P.sageBase);
    c.rect(19, handY + 5, 4, 3, P.sageMid);

    c.ellipse(45, handY, 4, 7, P.sageDark);
    c.ellipse(45, handY, 3, 6, P.sageBase);
    c.rect(41, handY + 5, 4, 3, P.sageMid);

    // Subtle brass fountain pen in right hand pocket / hand
    c.line(42, handY + 4, 43, handY + 8, P.penGold, 1);
  }

  return c;
}

// Generate the 6x4 64x64 Atlas (384x256 px) and 24 Frame Metadata entries
function generateCeoAtlas() {
  const frameCounts = { idle: 4, move: 6, working: 6, review_request: 4, relaxing: 4 };
  const atlasWidth = 64 * 6; // 384
  const atlasHeight = 64 * 4; // 256
  const atlasCanvas = new PixelCanvas(atlasWidth, atlasHeight);

  const entries = [];
  let index = 0;

  for (const state of Object.keys(frameCounts)) {
    const count = frameCounts[state];
    for (let f = 0; f < count; f++) {
      const col = index % 6;
      const row = Math.floor(index / 6);
      const x = col * 64;
      const y = row * 64;

      const frameCanvas = drawCeoFrame(state, f);
      atlasCanvas.drawImage(frameCanvas, x, y);

      entries.push({
        state,
        direction: 'south',
        frame: f,
        duration: state === 'move' ? 120 : state === 'working' ? 160 : 200,
        x,
        y,
        w: 64,
        h: 64,
        pivot: [32, 58],
        occlusionGroup: 'actor'
      });

      index++;
    }
  }

  return { atlasCanvas, entries };
}

// Generate the Upgraded CEO Desk Layer Images (Back, Front, Combined)
function generateCeoDeskLayers() {
  // CEO desk dimensions: 160w x 64h at position x:96, y:170
  // Full world size: 1024 x 576
  const fullBack = new PixelCanvas(1024, 576);
  const fullFront = new PixelCanvas(1024, 576);
  const fullCombined = new PixelCanvas(1024, 576);

  const x = 96;
  const y = 170;
  const w = 160;

  // Colors for warm executive oak desk
  const woodDark = '#784e2a';
  const woodBase = '#b68352';
  const woodMid = '#c99662';
  const woodLight = '#deb381';
  const woodHi = '#f2d4ab';
  const inkDark = '#483523';
  const blotterLeather = '#382b20';
  const blotterBorder = '#c9a552';
  const lampBrass = '#d4ae43';
  const lampGreen = '#1f4a33';

  // 1. BACK PASS: Executive Chair, Floor contact shadow, Desktop Surface, Banker Lamp, Desk Blotter, Inbox Tray, Pen Stand, Mug
  function drawBack(c) {
    // Floor shadow
    c.ellipse(x + w / 2, y + 66, w * 0.48, 6, '#8d71452b');

    // Desk Rear & Desktop Surface (y+14 to y+38)
    // Desktop slab top edge with beveled oak
    c.box(x, y + 14, w, 24, woodBase, woodDark);
    c.rect(x + 2, y + 16, w - 4, 20, woodMid);
    c.line(x + 2, y + 16, x + w - 3, y + 16, woodHi, 1);
    c.line(x + 3, y + 17, x + w - 4, y + 17, woodLight, 1);

    // Warm natural wood grain lines across desktop
    for (let gy = 20; gy < 34; gy += 4) {
      c.line(x + 6, y + gy, x + w - 8, y + gy, '#a8744433', 1);
    }

    // Large executive leather desk blotter centered where CEO works
    const blotterX = x + 44;
    const blotterW = 72;
    c.box(blotterX, y + 17, blotterW, 19, blotterLeather, inkDark);
    c.box(blotterX + 2, y + 18, blotterW - 4, 17, '#423326', blotterBorder);
    c.rect(blotterX + 4, y + 20, blotterW - 8, 13, blotterLeather);
    // Golden corner accents
    c.setPixel(blotterX + 3, y + 19, 218, 178, 80, 1);
    c.setPixel(blotterX + blotterW - 4, y + 19, 218, 178, 80, 1);

    // Brass Banker's Lamp on the left
    const lampX = x + 16;
    const lampY = y - 10;
    // Cast shadow from lamp on desk
    c.ellipse(lampX + 6, y + 18, 9, 3, '#00000028');
    // Circular heavy brass base
    c.box(lampX + 1, y + 14, 11, 4, lampBrass, '#8e6d24');
    // Arched brass neck
    c.line(lampX + 6, y + 14, lampX + 6, lampY + 5, lampBrass, 2);
    c.line(lampX + 6, lampY + 5, lampX + 10, lampY + 2, lampBrass, 2);
    // Green glass shade
    c.box(lampX + 3, lampY - 1, 15, 7, lampGreen, '#143021');
    c.line(lampX + 4, lampY, lampX + 16, lampY, '#367252', 1); // emerald glass glint
    // Warm golden light glow under shade
    c.line(lampX + 4, lampY + 5, lampX + 16, lampY + 5, '#fff6bf', 1);
    // Golden desk glow pool
    c.ellipse(lampX + 10, y + 19, 14, 4, '#fff7c730');

    // Wooden Pen Stand with two angled brass pens (right of blotter)
    const penX = x + 120;
    c.box(penX, y + 18, 8, 5, woodDark, inkDark);
    c.line(penX + 2, y + 19, penX - 2, y + 12, P.penGold, 1);
    c.line(penX + 5, y + 19, penX + 9, y + 13, P.penGold, 1);

    // Executive In/Out Tray with approval dossier & red seal
    const trayX = x + 131;
    c.box(trayX, y + 16, 23, 18, '#5e3f22', '#3a2512');
    c.box(trayX + 2, y + 18, 19, 14, P.paperBase, P.paperDark);
    c.line(trayX + 4, y + 21, trayX + 17, y + 21, P.paperDark, 1);
    c.line(trayX + 4, y + 24, trayX + 15, y + 24, P.paperDark, 1);
    c.line(trayX + 4, y + 27, trayX + 18, y + 27, P.paperDark, 1);
    // Vermilion approval seal
    c.box(trayX + 14, y + 25, 4, 4, P.paperSeal, '#7a221b');
    c.setPixel(trayX + 15, y + 26, 255, 255, 255, 0.7);

    // Premium ceramic mug with barley tea
    const mugX = x + 34;
    c.box(mugX, y + 16, 8, 9, '#f6eee2', '#aa9577');
    c.box(mugX + 7, y + 18, 3, 5, '#eedfcb', '#aa9577'); // handle
    c.ellipse(mugX + 4, y + 17, 3, 1, '#6b4f32'); // tea
    c.setPixel(mugX + 2, y + 19, 255, 255, 255, 0.8); // ceramic shine
  }

  // 2. FRONT PASS: Modesty panel, Pedestal drawers, and desk front rim (depth: y + 64)
  function drawFront(c) {
    // Desktop lower front edge rim (y+36 to y+39)
    c.rect(x + 2, y + 36, w - 4, 3, woodDark);
    c.line(x + 2, y + 36, x + w - 3, y + 36, woodHi, 1);

    // Left Drawer Pedestal (x+6 to x+42, y+39 to y+63)
    c.box(x + 6, y + 39, 36, 23, woodBase, woodDark);
    // 2 drawers with beveled borders
    for (let d = 0; d < 2; d++) {
      const dy = y + 41 + d * 10;
      c.box(x + 8, dy, 32, 8, woodMid, woodDark);
      c.line(x + 9, dy + 1, x + 38, dy + 1, woodHi, 1);
      // Solid brass drawer drop pull
      c.box(x + 21, dy + 3, 6, 2, lampBrass, '#795a1c');
    }

    // Right Drawer Pedestal (x+118 to x+154, y+39 to y+63)
    c.box(x + 118, y + 39, 36, 23, woodBase, woodDark);
    for (let d = 0; d < 2; d++) {
      const dy = y + 41 + d * 10;
      c.box(x + 120, dy, 32, 8, woodMid, woodDark);
      c.line(x + 121, dy + 1, x + 150, dy + 1, woodHi, 1);
      c.box(x + 133, dy + 3, 6, 2, lampBrass, '#795a1c');
    }

    // Recessed Center Kneehole Modesty Panel (x+42 to x+118, y+39 to y+62)
    c.box(x + 42, y + 39, 76, 22, '#855933', woodDark);
    c.rect(x + 44, y + 40, 72, 20, '#9e6d41');
    // Vertical beadboard grooves
    for (let gx = x + 48; gx < x + 114; gx += 8) {
      c.line(gx, y + 40, gx, y + 59, '#7a4e28', 1);
    }

    // Bottom plinth feet with dark shadow
    c.rect(x + 6, y + 62, 36, 2, '#503318');
    c.rect(x + 118, y + 62, 36, 2, '#503318');
  }

  drawBack(fullBack);
  drawFront(fullFront);

  drawBack(fullCombined);
  drawFront(fullCombined);

  return { fullBack, fullFront, fullCombined };
}

// Generate comparison image: Before vs After side-by-side
function generateComparisonImage(oldAtlasCanvas, newAtlasCanvas, deskLayers) {
  // Width: 800, Height: 480
  const comp = new PixelCanvas(800, 480);
  comp.rect(0, 0, 800, 480, '#f4ece1');

  // Title header banner
  comp.rect(20, 20, 760, 40, '#42583d');
  // Divider line
  comp.line(400, 70, 400, 460, '#c7b69d', 2);

  // Labels
  // Left: BEFORE (기존 48x48)
  // Right: AFTER (개선 64x64 세이지 개구리 & 분리형 데스크)

  // Draw 3 poses for Before and After: Idle, Working, Review
  // Scale each 2x nearest-neighbor for high visibility
  function drawScaled(srcCanvas, sx, sy, sw, sh, dx, dy, scale) {
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const idx = ((sy + y) * srcCanvas.width + (sx + x)) * 4;
        const a = srcCanvas.buffer[idx + 3] / 255;
        if (a > 0) {
          const r = srcCanvas.buffer[idx];
          const g = srcCanvas.buffer[idx + 1];
          const b = srcCanvas.buffer[idx + 2];
          for (let py = 0; py < scale; py++) {
            for (let px = 0; px < scale; px++) {
              comp.setPixel(dx + x * scale + px, dy + y * scale + py, r, g, b, a);
            }
          }
        }
      }
    }
  }

  // Draw Before poses (from old atlas)
  // Idle frame 0: at (0, 0, 48, 48)
  drawScaled(oldAtlasCanvas, 0, 0, 48, 48, 50, 110, 2);
  // Working frame 0: at (192, 48, 48, 48)
  drawScaled(oldAtlasCanvas, 192, 48, 48, 48, 160, 110, 2);
  // Review frame 0: at (192, 96, 48, 48)
  drawScaled(oldAtlasCanvas, 192, 96, 48, 48, 270, 110, 2);

  // Draw After poses (from new atlas)
  // Idle frame 0: at (0, 0, 64, 64)
  drawScaled(newAtlasCanvas, 0, 0, 64, 64, 430, 100, 2);
  // Working frame 2 (writing): at (128, 64, 64, 64)
  drawScaled(newAtlasCanvas, 128, 64, 64, 64, 550, 100, 2);
  // Review frame 2 (dossier): at (128, 128, 64, 64)
  drawScaled(newAtlasCanvas, 128, 128, 64, 64, 670, 100, 2);

  // Draw Desk Area comparison at bottom
  // Old desk cropped from (70, 150, 210, 95)
  // New desk cropped from (70, 150, 210, 95)
  const deskX = 96;
  const deskY = 170;
  const deskW = 160;
  const deskH = 64;

  // Draw New Desk Combined preview
  drawScaled(deskLayers.fullCombined, deskX - 10, deskY - 20, deskW + 20, deskH + 30, 440, 280, 1);

  return comp;
}

// MAIN EXECUTION
console.log('Generating improved CEO character atlas and CEO desk assets...');

// Load old bullfrog atlas for comparison
const oldAtlasPath = path.join(__dirname, '..', 'assets', 'bullfrog-atlas.png');
let oldAtlasBuffer = fs.readFileSync(oldAtlasPath);
// Minimal PNG decode for old atlas
function parsePng(buf) {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const chunks = [];
  let pos = 8;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') chunks.push(buf.subarray(pos + 8, pos + 8 + len));
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(chunks));
  const canvas = new PixelCanvas(w, h);
  const rowSize = w * 4;
  for (let y = 0; y < h; y++) {
    const rowOffset = y * (rowSize + 1) + 1;
    decompressed.copy(canvas.buffer, y * rowSize, rowOffset, rowOffset + rowSize);
  }
  return canvas;
}

const oldAtlasCanvas = parsePng(oldAtlasBuffer);

// Generate new Atlas & Frames
const { atlasCanvas: newAtlasCanvas, entries: newFrames } = generateCeoAtlas();

// Save new atlas PNG
const newAtlasPng = newAtlasCanvas.toPngBuffer();
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'bullfrog-atlas.png'), newAtlasPng);
console.log('Saved assets/bullfrog-atlas.png (' + newAtlasPng.length + ' bytes)');

// Save new frames JSON
fs.writeFileSync(
  path.join(__dirname, '..', 'assets', 'bullfrog-frames.json'),
  JSON.stringify(newFrames, null, 2),
  'utf-8'
);
console.log('Saved assets/bullfrog-frames.json (' + newFrames.length + ' frames)');

// Generate desk layers
const deskLayers = generateCeoDeskLayers();
const deskBackPng = deskLayers.fullBack.toPngBuffer();
const deskFrontPng = deskLayers.fullFront.toPngBuffer();
const deskCombinedPng = deskLayers.fullCombined.toPngBuffer();

fs.writeFileSync(path.join(__dirname, '..', 'assets', 'furniture-ceo-desk-back.png'), deskBackPng);
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'furniture-ceo-desk-front.png'), deskFrontPng);
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'furniture-ceo-desk.png'), deskCombinedPng);
console.log('Saved assets/furniture-ceo-desk-back.png, furniture-ceo-desk-front.png, furniture-ceo-desk.png');

// Generate and save comparison image
const compCanvas = generateComparisonImage(oldAtlasCanvas, newAtlasCanvas, deskLayers);
const compPng = compCanvas.toPngBuffer();
fs.writeFileSync(path.join(__dirname, '..', 'assets', 'preview-ceo-comparison.png'), compPng);
console.log('Saved assets/preview-ceo-comparison.png (' + compPng.length + ' bytes)');

console.log('All upgraded assets successfully generated!');
