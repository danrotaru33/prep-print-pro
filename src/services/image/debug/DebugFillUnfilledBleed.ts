
export function debugFillUnfilledBleed(
  ctx: CanvasRenderingContext2D,
  bleedPixels: number,
  finalWidth: number,
  finalHeight: number
): void {
  const canvasWidth = finalWidth + bleedPixels * 2;
  const canvasHeight = finalHeight + bleedPixels * 2;
  let outCount = 0;
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;
  let isTopWhite = true;
  let isBottomWhite = true;
  let isLeftWhite = true;
  let isRightWhite = true;
  for (let y = 0; y < bleedPixels; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const idx = (y * canvasWidth + x) * 4;
      if (data[idx] !== 255 || data[idx+1] !== 255 || data[idx+2] !== 255) {
        isTopWhite = false; break;
      }
    }
    if (!isTopWhite) break;
  }
  for (let y = canvasHeight-bleedPixels; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const idx = (y * canvasWidth + x) * 4;
      if (data[idx] !== 255 || data[idx+1] !== 255 || data[idx+2] !== 255) {
        isBottomWhite = false; break;
      }
    }
    if (!isBottomWhite) break;
  }
  for (let x = 0; x < bleedPixels; x++) {
    for (let y = 0; y < canvasHeight; y++) {
      const idx = (y * canvasWidth + x) * 4;
      if (data[idx] !== 255 || data[idx+1] !== 255 || data[idx+2] !== 255) {
        isLeftWhite = false; break;
      }
    }
    if (!isLeftWhite) break;
  }
  for (let x = canvasWidth-bleedPixels; x < canvasWidth; x++) {
    for (let y = 0; y < canvasHeight; y++) {
      const idx = (y * canvasWidth + x) * 4;
      if (data[idx] !== 255 || data[idx+1] !== 255 || data[idx+2] !== 255) {
        isRightWhite = false; break;
      }
    }
    if (!isRightWhite) break;
  }
  ctx.save();
  ctx.globalAlpha = 0.3;
  if (isTopWhite) {
    ctx.fillStyle = '#ff70fa';
    ctx.fillRect(0,0,canvasWidth,bleedPixels);
    outCount++;
    console.warn('[AI-Bleed Debug] Top margin still pure white in output');
  }
  if (isBottomWhite) {
    ctx.fillStyle = '#ff70fa';
    ctx.fillRect(0,canvasHeight-bleedPixels,canvasWidth,bleedPixels);
    outCount++;
    console.warn('[AI-Bleed Debug] Bottom margin still pure white in output');
  }
  if (isLeftWhite) {
    ctx.fillStyle = '#ff70fa';
    ctx.fillRect(0,0,bleedPixels,canvasHeight);
    outCount++;
    console.warn('[AI-Bleed Debug] Left margin still pure white in output');
  }
  if (isRightWhite) {
    ctx.fillStyle = '#ff70fa';
    ctx.fillRect(canvasWidth-bleedPixels,0,bleedPixels,canvasHeight);
    outCount++;
    console.warn('[AI-Bleed Debug] Right margin still pure white in output');
  }
  ctx.restore();
  if (outCount > 0) {
    console.warn(`[AI-Bleed Debug] ${outCount} margins have not been filled by AI and remain white`);
  }
}
