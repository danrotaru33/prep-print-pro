
export class BleedProcessor {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
  }

  async extendBleedAreas(
    bleedPixels: number,
    finalWidth: number,
    finalHeight: number
  ): Promise<void> {
    console.log('Extending bleed areas by', bleedPixels, 'pixels');
    
    if (bleedPixels === 0) {
      console.log('No bleed margin specified, skipping bleed extension');
      return;
    }
    
    // Get the current canvas data
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const { data, width, height } = imageData;
    
    // Extend top bleed - copy from the first row of content
    for (let y = 0; y < bleedPixels; y++) {
      for (let x = bleedPixels; x < bleedPixels + finalWidth; x++) {
        const sourceY = bleedPixels;
        const sourceIndex = ((sourceY * width) + x) * 4;
        const targetIndex = ((y * width) + x) * 4;
        if (sourceIndex < data.length - 3) {
          data[targetIndex] = data[sourceIndex];
          data[targetIndex + 1] = data[sourceIndex + 1];
          data[targetIndex + 2] = data[sourceIndex + 2];
          data[targetIndex + 3] = data[sourceIndex + 3];
        }
      }
    }
    // Extend bottom bleed - copy from the last row of content
    for (let y = bleedPixels + finalHeight; y < height; y++) {
      for (let x = bleedPixels; x < bleedPixels + finalWidth; x++) {
        const sourceY = bleedPixels + finalHeight - 1;
        const sourceIndex = ((sourceY * width) + x) * 4;
        const targetIndex = ((y * width) + x) * 4;
        if (sourceIndex < data.length - 3) {
          data[targetIndex] = data[sourceIndex];
          data[targetIndex + 1] = data[sourceIndex + 1];
          data[targetIndex + 2] = data[sourceIndex + 2];
          data[targetIndex + 3] = data[sourceIndex + 3];
        }
      }
    }
    // Extend left bleed - copy from the first column of content
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < bleedPixels; x++) {
        const sourceX = bleedPixels;
        const sourceIndex = ((y * width) + sourceX) * 4;
        const targetIndex = ((y * width) + x) * 4;
        if (sourceIndex < data.length - 3) {
          data[targetIndex] = data[sourceIndex];
          data[targetIndex + 1] = data[sourceIndex + 1];
          data[targetIndex + 2] = data[sourceIndex + 2];
          data[targetIndex + 3] = data[sourceIndex + 3];
        }
      }
    }
    // Extend right bleed - copy from the last column of content
    for (let y = 0; y < height; y++) {
      for (let x = bleedPixels + finalWidth; x < width; x++) {
        const sourceX = bleedPixels + finalWidth - 1;
        const sourceIndex = ((y * width) + sourceX) * 4;
        const targetIndex = ((y * width) + x) * 4;
        if (sourceIndex < data.length - 3) {
          data[targetIndex] = data[sourceIndex];
          data[targetIndex + 1] = data[sourceIndex + 1];
          data[targetIndex + 2] = data[sourceIndex + 2];
          data[targetIndex + 3] = data[sourceIndex + 3];
        }
      }
    }

    // *** New: Flood fill any remaining pure white pixels in the bleed area with adjacent pixel color (from the edge),
    // ensuring *no* white border remains. This makes up for cases where AI or previous fills left small gaps. ***
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Only process in the bleed region (outside main area)
        if (
          x < bleedPixels ||
          x >= bleedPixels + finalWidth ||
          y < bleedPixels ||
          y >= bleedPixels + finalHeight
        ) {
          const idx = (y * width + x) * 4;
          // Is this pixel still fully white and fully opaque?
          if (
            data[idx] === 255 && data[idx+1] === 255 && data[idx+2] === 255 && data[idx+3] === 255
          ) {
            // Copy from closest content edge:
            let srcX = x;
            let srcY = y;
            if (x < bleedPixels) srcX = bleedPixels;
            else if (x >= bleedPixels + finalWidth) srcX = bleedPixels + finalWidth - 1;
            if (y < bleedPixels) srcY = bleedPixels;
            else if (y >= bleedPixels + finalHeight) srcY = bleedPixels + finalHeight - 1;
            const srcIdx = (srcY * width + srcX) * 4;
            data[idx] = data[srcIdx];
            data[idx + 1] = data[srcIdx + 1];
            data[idx + 2] = data[srcIdx + 2];
            data[idx + 3] = data[srcIdx + 3];
          }
        }
      }
    }

    // Apply all pixel updates at once
    this.ctx.putImageData(imageData, 0, 0);
    console.log('Bleed extension (including white padding fix) completed successfully');
  }
}
