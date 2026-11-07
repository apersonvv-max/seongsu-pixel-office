'use strict';
const sharp = require('sharp');
const fs = require('fs');

async function patchKarina() {
  const masterBuf = await sharp('public/assets/aistudio/____________________d789ea12.png')
    .resize(1024, 576, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  // Extract clean floor from x:650..740, y:310..450 (width: 90, height: 140)
  const cleanFloor = await sharp(masterBuf)
    .extract({ left: 650, top: 310, width: 90, height: 140 })
    .toBuffer();

  // Clean Whiteboard
  const whiteboard = await sharp('assets/hd-furniture/whiteboard.png')
    .resize(138, 116, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const patched = await sharp(masterBuf)
    .composite([
      { input: cleanFloor, left: 355, top: 305 },
      { input: whiteboard, left: 440, top: 285 }
    ])
    .png()
    .toBuffer();

  fs.writeFileSync('assets/warm-office-bg.png', patched);
  console.log('Saved assets/warm-office-bg.png with flawless clean floor!');
}

patchKarina().catch(console.error);
