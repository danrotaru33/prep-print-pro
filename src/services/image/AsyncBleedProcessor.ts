
export class AsyncBleedProcessor {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private isCancelled = false;

  constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
  }

  cancel(): void {
    this.isCancelled = true;
  }

  async extendBleedAreas(
    bleedPixels: number,
    finalWidth: number,
    finalHeight: number,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    console.log('Extending bleed areas by', bleedPixels, 'pixels (async)');

    if (bleedPixels === 0) {
      console.log('No bleed margin specified, skipping bleed extension');
      return;
    }

    if (this.isCancelled) {
      throw new Error('Processing cancelled');
    }

    // Get the current canvas data
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const { data, width, height } = imageData;

    const totalSteps = 5; // Top, bottom, left, right, white pixel replacement
    let currentStep = 0;

    // Helper function to yield control and update progress
    const yieldAndUpdateProgress = async () => {
      currentStep++;
      if (onProgress) {
        onProgress((currentStep / totalSteps) * 100);
      }
      // Yield control back to the browser
      await new Promise(resolve => setTimeout(resolve, 0));
      
      if (this.isCancelled) {
        throw new Error('Processing cancelled');
      }
    };

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
    await yieldAndUpdateProgress();

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
    await yieldAndUpdateProgress();

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
    await yieldAndUpdateProgress();

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
    await yieldAndUpdateProgress();

    // Process white pixel replacement in batches
    let replacedCount = 0;
    const batchSize = 1000; // Process 1000 pixels at a time
    const totalPixels = width * height;
    let processedPixels = 0;

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
          const r = data[idx], g = data[idx+1], b = data[idx+2], a = data[idx+3];
          
          // Tolerant: Anything that is nearly white and fully or semi-opaque
          if (r > 235 && g > 235 && b > 235 && a > 200) {
            let srcX = x;
            let srcY = y;
            if (x < bleedPixels) srcX = bleedPixels;
            else if (x >= bleedPixels + finalWidth) srcX = bleedPixels + finalWidth - 1;
            if (y < bleedPixels) srcY = bleedPixels;
            else if (y >= bleedPixels + finalHeight) srcY = bleedPixels + finalHeight - 1;
            const srcIdx = (srcY * width + srcX) * 4;
            
            // Copy from nearest edge content pixel
            data[idx] = data[srcIdx];
            data[idx + 1] = data[srcIdx + 1];
            data[idx + 2] = data[srcIdx + 2];
            data[idx + 3] = data[srcIdx + 3];
            replacedCount++;
          }
        }

        processedPixels++;
        
        // Yield control every batch
        if (processedPixels % batchSize === 0) {
          if (this.isCancelled) {
            throw new Error('Processing cancelled');
          }
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    }

    await yieldAndUpdateProgress();

    if (replacedCount > 0) {
      console.log(`[AsyncBleedProcessor] Filled ${replacedCount} nearly-white pixels in bleed area from nearest edge`);
    }

    // Apply all pixel updates at once
    this.ctx.putImageData(imageData, 0, 0);
    console.log('Async bleed extension (including white/near-white padding fix) completed successfully');
  }
}
