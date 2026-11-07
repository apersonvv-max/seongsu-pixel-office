'use strict';
const sharp = require('sharp');
const fs = require('fs');

async function buildCleanOffice() {
  console.log('Building pristine empty office room background...');

  // Start with 1024x576 resized master room
  const baseBuffer = await sharp('public/assets/aistudio/image_c108544d.png')
    .resize(1024, 576, { fit: 'fill' })
    .toBuffer();

  // Load the atlas image to extract clean parquet patches and empty chairs
  const atlas = sharp('public/assets/aistudio/image_65f87ba6.png');
  const atlasMeta = await atlas.metadata();
  console.log('Atlas meta:', atlasMeta.width, atlasMeta.height);

  // Parquet floor patch from atlas: top left floor tile
  // In 1536x1024 atlas, floor tile 1 is roughly at [10, 42, 168, 126]
  // Let's extract clean parquet tile and tile with sunbeam
  const floorPlain = await atlas.clone()
    .extract({ left: 10, top: 42, width: 168, height: 126 })
    .resize(120, 90)
    .toBuffer();

  // Clean empty Whiteboard from hd-furniture
  // In 1024x576 world, whiteboard is at x=424, y=290, w=112, h=62
  // But in base image, whiteboard has capybara walking right next to it!
  // If we overlay clean floor over the center area (x=330..430, y=300..430)
  // and overlay clean whiteboard, Karina is completely cleared!

  // Let's create a patch for Karina: clean floor sample from nearby (x=480..600, y=200..320 in base image)
  const floorSample = await sharp(baseBuffer)
    .extract({ left: 490, top: 220, width: 140, height: 140 })
    .toBuffer();

  const floorSample2 = await sharp(baseBuffer)
    .extract({ left: 280, top: 340, width: 120, height: 120 })
    .toBuffer();

  // CEO chair & desk:
  // In base image, CEO desk is at ~x=96, y=170
  // Clean empty CEO chair: assets/hd-furniture/ceo-chair.png (128x172) -> resize to fit
  // CEO desk in base has CEO upper body. Clean ceo-chair & ceo-desk:
  const ceoChair = await sharp('assets/hd-furniture/ceo-chair.png')
    .resize(90, 120, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const ceoDesk = await sharp('assets/hd-furniture/ceo-desk.png')
    .resize(176, 114, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Miki desk:
  // Clean office-chair:
  const mikiChair = await sharp('assets/hd-furniture/office-chair.png')
    .resize(76, 100, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const mikiDesk = await sharp('assets/hd-furniture/miki-desk.png')
    .resize(164, 104, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Yoo desk:
  const yooDesk = await sharp('assets/hd-furniture/yoo-desk.png')
    .resize(168, 108, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const dualMonitors = await sharp('assets/hd-furniture/dual-monitors.png')
    .resize(150, 80, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Son desk:
  const sonDesk = await sharp('assets/hd-furniture/son-desk.png')
    .resize(170, 110, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const tablet = await sharp('assets/hd-furniture/tablet.png')
    .resize(90, 60, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const sonChair = await sharp('assets/hd-furniture/chair-blue.png')
    .resize(68, 102, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Clean Whiteboard:
  const whiteboard = await sharp('assets/hd-furniture/whiteboard.png')
    .resize(134, 112, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Clean round meeting table:
  const meetingTable = await sharp('assets/hd-furniture/meeting-table.png')
    .resize(130, 94, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Compose in exact order
  const composed = await sharp(baseBuffer)
    .composite([
      // 1. Cover Karina with clean floor patches
      { input: floorSample, left: 340, top: 300 },
      { input: floorSample2, left: 350, top: 320 },

      // 2. Overlay clean empty Whiteboard
      { input: whiteboard, left: 436, top: 285 },

      // 3. Overlay clean empty CEO Chair and clean CEO Desk
      { input: ceoChair, left: 114, top: 120 },
      { input: ceoDesk, left: 90, top: 175 },

      // 4. Overlay clean empty Miki Chair and Desk
      { input: mikiChair, left: 520, top: 138 },
      { input: mikiDesk, left: 504, top: 182 },

      // 5. Overlay clean empty Yoo Desk and Dual Monitors
      { input: yooDesk, left: 770, top: 195 },
      { input: dualMonitors, left: 780, top: 168 },

      // 6. Overlay clean empty Son Chair, Desk and Tablet
      { input: sonDesk, left: 42, top: 400 },
      { input: sonChair, left: 92, top: 432 },
      { input: tablet, left: 104, top: 388 }
    ])
    .png()
    .toBuffer();

  fs.writeFileSync('assets/warm-office-bg.png', composed);
  console.log('Saved assets/warm-office-bg.png (1024x576)');
}

buildCleanOffice().catch(console.error);
