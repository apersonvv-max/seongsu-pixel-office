'use strict';
const sharp = require('sharp');
const fs = require('fs');

async function main() {
  const master = sharp('public/assets/aistudio/image_c108544d.png');

  // 1. Clean floor texture for patching characters
  // Extract pure floor from x:1050, y:420, w:180, h:180
  const floorTile = await master.clone()
    .extract({ left: 1050, top: 430, width: 180, height: 180 })
    .toBuffer();

  const floorTile2 = await master.clone()
    .extract({ left: 1100, top: 500, width: 220, height: 160 })
    .toBuffer();

  // 2. Extract clean Whiteboard from image_65f87ba6.png
  // In 1536x1024 atlas, whiteboard is at x:1300..1520, y:230..405
  // We already have assets/hd-furniture/whiteboard.png (196x164)
  // Let's size it to match master scene whiteboard: width: ~230, height: ~195
  const whiteboard = await sharp('assets/hd-furniture/whiteboard.png')
    .resize(236, 198, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // 3. Clean CEO Chair and Desk
  const ceoChair = await sharp('assets/hd-furniture/ceo-chair.png')
    .resize(170, 228, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const ceoDesk = await sharp('assets/hd-furniture/ceo-desk.png')
    .resize(280, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // 4. Clean Miki Chair and Desk
  const mikiChair = await sharp('assets/hd-furniture/office-chair.png')
    .resize(140, 186, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const mikiDesk = await sharp('assets/hd-furniture/miki-desk.png')
    .resize(276, 172, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // 5. Clean Yoo Desk and Dual Monitors
  const yooDesk = await sharp('assets/hd-furniture/yoo-desk.png')
    .resize(290, 186, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const dualMonitors = await sharp('assets/hd-furniture/dual-monitors.png')
    .resize(240, 130, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // 6. Clean Son Desk, Chair and Tablet
  const sonDesk = await sharp('assets/hd-furniture/son-desk.png')
    .resize(280, 182, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const sonChair = await sharp('assets/hd-furniture/chair-blue.png')
    .resize(120, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const tablet = await sharp('assets/hd-furniture/tablet.png')
    .resize(160, 104, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Composite on 1671x941
  const clean1671 = await master
    .composite([
      // A. Karina removal: cover Karina walking at x:580..720, y:510..680 with clean floor
      { input: floorTile, left: 570, top: 510 },
      { input: floorTile2, left: 580, top: 530 },

      // B. Overlay pristine Whiteboard at x:728, y:468
      { input: whiteboard, left: 728, top: 468 },

      // C. CEO chair & desk at x:190, y:205 and x:145, y:285
      { input: ceoChair, left: 185, top: 205 },
      { input: ceoDesk, left: 145, top: 285 },

      // D. Miki chair & desk at x:870, y:235 and x:835, y:298
      { input: mikiChair, left: 868, top: 235 },
      { input: mikiDesk, left: 835, top: 298 },

      // E. Yoo desk & monitors at x:1270, y:370 and x:1280, y:315
      { input: yooDesk, left: 1265, top: 370 },
      { input: dualMonitors, left: 1285, top: 308 },

      // F. Son desk, tablet & chair at x:60, y:650
      { input: sonDesk, left: 60, top: 650 },
      { input: sonChair, left: 140, top: 710 },
      { input: tablet, left: 175, top: 645 }
    ])
    .png()
    .toBuffer();

  // Resize cleanly to exactly 1024x576 using Lanczos3 resampling for crisp pixels
  const finalBg = await sharp(clean1671)
    .resize(1024, 576, {
      kernel: sharp.kernel.lanczos3,
      fit: 'fill'
    })
    .png()
    .toBuffer();

  fs.writeFileSync('assets/warm-office-bg.png', finalBg);
  console.log('Successfully generated assets/warm-office-bg.png (1024x576)!');
}

main().catch(console.error);
