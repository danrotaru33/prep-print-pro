
export class BleedFallbackFiller {
  static finalFillBleedFromEdge(
    ctx: CanvasRenderingContext2D,
    bleedPixels: number,
    finalWidth: number,
    finalHeight: number
  ): void {
    const canvasWidth = finalWidth + bleedPixels * 2;
    const canvasHeight = finalHeight + bleedPixels * 2;
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const { data, width, height } = imageData;

    const isBleedWhite = (x: number, y: number) => {
      if (
        x < bleedPixels ||
        x >= bleedPixels + finalWidth ||
        y < bleedPixels ||
        y >= bleedPixels + finalHeight
      ) {
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        return r > 235 && g > 235 && b > 235 && a > 200;
      }
      return false;
    };

    const contentPixels: Array<[number, number]> = [];
    for (let y = bleedPixels; y < bleedPixels + finalHeight; y++) {
      for (let x = bleedPixels; x < bleedPixels + finalWidth; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
        if (!(r > 235 && g > 235 && b > 235) && a > 24) {
          contentPixels.push([x, y]);
        }
      }
    }

    if (contentPixels.length === 0) {
      console.warn('[AIBleedProcessor] No content pixels found for fallback bleed fill');
      return;
    }

    let filledCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!isBleedWhite(x, y)) continue;
        let nearestDist = Infinity;
        let nearestIdx = -1;
        for (let i = 0; i < contentPixels.length; i++) {
          const [cx, cy] = contentPixels[i];
          const dx = cx - x, dy = cy - y;
          const dist = dx * dx + dy * dy;
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIdx = i;
            if (dist === 0) break;
          }
        }
        if (nearestIdx !== -1) {
          const [srcX, srcY] = contentPixels[nearestIdx];
          const srcIdx = (srcY * width + srcX) * 4;
          const idx = (y * width + x) * 4;
          data[idx]     = data[srcIdx];
          data[idx + 1] = data[srcIdx + 1];
          data[idx + 2] = data[srcIdx + 2];
          data[idx + 3] = data[srcIdx + 3];
          filledCount++;
        }
      }
    }
    if (filledCount > 0) {
      console.log(`[AIBleedProcessor] [finalFillBleedFromEdge] True nearest-neighbor: filled ${filledCount} margin pixels with nearest content color`);
      ctx.putImageData(imageData, 0, 0);
    } else {
      console.log('[AIBleedProcessor] [finalFillBleedFromEdge] No margin pixels needed filling');
    }
  }
}
