// Run with: node create-icons.js
// Creates simple green HP icon PNGs for the Chrome extension

const { createCanvas } = require("canvas");
const fs = require("fs");

const sizes = [16, 48, 128];

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, size, size);

  // HP text
  ctx.fillStyle = "#00e676";
  ctx.font = `900 ${Math.floor(size * 0.5)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("HP", size / 2, size / 2);

  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(`icon${size}.png`, buffer);
  console.log(`Created icon${size}.png`);
}
