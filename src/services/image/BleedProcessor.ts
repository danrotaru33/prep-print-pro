
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
    
    // Create a copy to work with
    const newData = new Uint8ClampedArray(data);
    
    console.log('Processing bleed extension for content area:', {
      contentX: bleedPixels,
      contentY: bleedPixels,
      contentWidth: finalWidth,
      contentHeight: finalHeight,
      totalWidth: width,
      totalHeight: height
    });
    
    // Extend top bleed - copy from the first row of content
    for (let y = 0; y < bleedPixels; y++) {
      for (let x = bleedPixels; x < bleedPixels + finalWidth; x++) {
        const sourceY = bleedPixels;
        const sourceIndex = ((sourceY * width) + x) * 4;
        const targetIndex = ((y * width) + x) * 4;
        
        // Copy pixel data (R, G, B, A)
        if (sourceIndex < data.length - 3) {
          newData[targetIndex] = data[sourceIndex];         // R
          newData[targetIndex + 1] = data[sourceIndex + 1]; // G
          newData[targetIndex + 2] = data[sourceIndex + 2]; // B
          newData[targetIndex + 3] = data[sourceIndex + 3]; // A
        }
      }
    }
    
    // Extend bottom bleed - copy from the last row of content
    for (let y = bleedPixels + finalHeight; y < height; y++) {
      for (let x = bleedPixels; x < bleedPixels + finalWidth; x++) {
        const sourceY = bleedPixels + finalHeight - 1;
        const sourceIndex = ((sourceY * width) + x) * 4;
        const targetIndex = ((y * width) + x) * 4;
        
        // Copy pixel data (R, G, B, A)
        if (sourceIndex < data.length - 3) {
          newData[targetIndex] = data[sourceIndex];
          newData[targetIndex + 1] = data[sourceIndex + 1];
          newData[targetIndex + 2] = data[sourceIndex + 2];
          newData[targetIndex + 3] = data[sourceIndex + 3];
        }
      }
    }
    
    // Extend left bleed - copy from the first column of content
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < bleedPixels; x++) {
        const sourceX = bleedPixels;
        const sourceIndex = ((y * width) + sourceX) * 4;
        const targetIndex = ((y * width) + x) * 4;
        
        // Copy pixel data (R, G, B, A)
        if (sourceIndex < data.length - 3) {
          newData[targetIndex] = data[sourceIndex];
          newData[targetIndex + 1] = data[sourceIndex + 1];
          newData[targetIndex + 2] = data[sourceIndex + 2];
          newData[targetIndex + 3] = data[sourceIndex + 3];
        }
      }
    }
    
    // Extend right bleed - copy from the last column of content
    for (let y = 0; y < height; y++) {
      for (let x = bleedPixels + finalWidth; x < width; x++) {
        const sourceX = bleedPixels + finalWidth - 1;
        const sourceIndex = ((y * width) + sourceX) * 4;
        const targetIndex = ((y * width) + x) * 4;
        
        // Copy pixel data (R, G, B, A)
        if (sourceIndex < data.length - 3) {
          newData[targetIndex] = data[sourceIndex];
          newData[targetIndex + 1] = data[sourceIndex + 1];
          newData[targetIndex + 2] = data[sourceIndex + 2];
          newData[targetIndex + 3] = data[sourceIndex + 3];
        }
      }
    }
    
    // Apply the changes back to the canvas
    const newImageData = new ImageData(newData, width, height);
    this.ctx.putImageData(newImageData, 0, 0);
    
    console.log('Bleed extension completed successfully');
  }
}
