'use strict';
const sharp = require('sharp');
const fs = require('fs');

async function generateCleanRoom() {
  console.log('Generating clean room background with empty furniture and seamless parquet...');

  // Base is 1024x576
  const baseImg = sharp('assets/master-office-background.png');
  const baseBuffer = await baseImg.toBuffer();

  // Extract clean parquet patch from x:620, y:330, w:110, h:110
  const parquetPatch1 = await sharp(baseBuffer)
    .extract({ left: 620, top: 330, width: 110, height: 110 })
    .toBuffer();

  // Clean Whiteboard
  const whiteboard = await sharp('assets/hd-furniture/whiteboard.png')
    .resize(138, 116, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Clean CEO Chair and Desk
  const ceoChair = await sharp('assets/hd-furniture/ceo-chair.png')
    .resize(100, 134, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const ceoDesk = await sharp('assets/hd-furniture/ceo-desk.png')
    .resize(176, 114, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Clean Miki Chair and Desk
  const mikiChair = await sharp('assets/hd-furniture/office-chair.png')
    .resize(80, 108, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const mikiDesk = await sharp('assets/hd-furniture/miki-desk.png')
    .resize(164, 104, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Clean Yoo Desk and Monitors
  const yooDesk = await sharp('assets/hd-furniture/yoo-desk.png')
    .resize(168, 108, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const dualMonitors = await sharp('assets/hd-furniture/dual-monitors.png')
    .resize(150, 80, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Clean Son Desk, Chair and Tablet
  const sonDesk = await sharp('assets/hd-furniture/son-desk.png')
    .resize(170, 110, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const sonChair = await sharp('assets/hd-furniture/chair-blue.png')
    .resize(70, 106, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const tablet = await sharp('assets/hd-furniture/tablet.png')
    .resize(96, 62, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Composite cleanly onto baseBuffer
  const cleanRoom = await sharp(baseBuffer)
    .composite([
      // 1. Cover Karina with clean parquet patch
      { input: parquetPatch1, left: 345, top: 310 },

      // 2. Overlay clean Whiteboard
      { input: whiteboard, left: 440, top: 285 },

      // 3. Clean CEO Chair and Desk
      { input: ceoChair, left: 112, top: 122 },
      { input: ceoDesk, left: 90, top: 172 },

      // 4. Clean Miki Chair and Desk
      { input: mikiChair, left: 524, top: 142 },
      { input: mikiDesk, left: 504, top: 180 },

      // 5. Clean Yoo Desk and Dual Monitors
      { input: yooDesk, left: 772, top: 195 },
      { input: dualMonitors, left: 780, top: 168 },

      // 6. Clean Son Desk, Chair and Tablet
      { input: sonDesk, left: 40, top: 400 },
      { input: sonChair, left: 90, top: 434 },
      { input: tablet, left: 104, top: 388 }
    ])
    .png()
    .toBuffer();

  fs.writeFileSync('assets/warm-office-bg.png', cleanRoom);
  console.log('Saved assets/warm-office-bg.png successfully.');
}

generateCleanRoom().catch(console.error);
