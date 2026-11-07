'use strict';
const sharp = require('sharp');
const fs = require('fs');

async function patchKarina() {
  // Read scaled 1024x576 of user's new image ____________________d789ea12.png
  const masterBuf = await sharp('public/assets/aistudio/____________________d789ea12.png')
    .resize(1024, 576, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  // Extract clean parquet floor from right of center: x:610..770, y:280..450 (w:150, h:170)
  const cleanFloor = await sharp(masterBuf)
    .extract({ left: 620, top: 280, width: 140, height: 160 })
    .toBuffer();

  // Whiteboard from assets/hd-furniture/whiteboard.png
  const whiteboard = await sharp('assets/hd-furniture/whiteboard.png')
    .resize(138, 116, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Composite cleanFloor over Karina (x:340..460, y:290..440)
  // And overlay pristine whiteboard
  const patched = await sharp(masterBuf)
    .composite([
      { input: cleanFloor, left: 340, top: 290 },
      { input: whiteboard, left: 440, top: 285 }
    ])
    .png()
    .toBuffer();

  fs.writeFileSync('assets/warm-office-bg.png', patched);
  console.log('Successfully patched Karina with seamless clean parquet floor!');
}

patchKarina().catch(console.error);
