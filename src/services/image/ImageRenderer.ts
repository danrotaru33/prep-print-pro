
import { CanvasContext } from "./types";

export class ImageRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor({ canvas, ctx }: CanvasContext) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  setupCanvas(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Fill background with white
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, width, height);
    console.log(`Canvas setup: ${width}x${height} with white background`);
  }

  async resizeAndPositionContent(
    img: HTMLImageElement,
    finalWidth: number,
    finalHeight: number,
    bleedPixels: number
  ): Promise<void> {
    console.log('=== CONTENT POSITIONING START ===');
    console.log('Resizing and positioning content');
    console.log(`Input image: ${img.width}x${img.height}`);
    console.log(`Target area: ${finalWidth}x${finalHeight} with ${bleedPixels}px bleed`);
    
    // Calculate scaling to fit within final dimensions while maintaining aspect ratio
    const scaleX = finalWidth / img.width;
    const scaleY = finalHeight / img.height;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    
    // Center the content within the final dimensions
    const x = bleedPixels + (finalWidth - scaledWidth) / 2;
    const y = bleedPixels + (finalHeight - scaledHeight) / 2;
    
    console.log(`Scaled dimensions: ${scaledWidth.toFixed(1)}x${scaledHeight.toFixed(1)} (scale: ${scale.toFixed(3)})`);
    console.log(`Position: (${x.toFixed(1)}, ${y.toFixed(1)})`);
    
    // Set high quality scaling
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Clear the area where we'll draw (to ensure clean positioning)
    this.ctx.save();
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(x, y, scaledWidth, scaledHeight);
    this.ctx.restore();
    
    // Draw the image
    this.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    console.log('Content drawn to canvas successfully');
    
    // Verify the image was actually drawn
    const imageData = this.ctx.getImageData(x, y, Math.min(scaledWidth, 10), Math.min(scaledHeight, 10));
    const hasContent = this.checkPixelData(imageData);
    console.log('Content verification - image data present:', hasContent);
    
    console.log('=== CONTENT POSITIONING END ===');
  }

  private checkPixelData(imageData: ImageData): boolean {
    const { data } = imageData;
    // Check if any pixel is not white
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // If we find any non-white pixel, there's content
      if (r !== 255 || g !== 255 || b !== 255) {
        return true;
      }
    }
    return false;
  }

  async createMockImage(width: number, height: number, text: string[]): Promise<HTMLImageElement> {
    console.log(`Creating mock image: ${width}x${height}`);
    const mockCanvas = document.createElement('canvas');
    const mockCtx = mockCanvas.getContext('2d')!;
    
    mockCanvas.width = width;
    mockCanvas.height = height;
    
    // Create a simple mock content with better styling
    mockCtx.fillStyle = '#f8f9fa';
    mockCtx.fillRect(0, 0, width, height);
    
    // Add border
    mockCtx.strokeStyle = '#dee2e6';
    mockCtx.lineWidth = 2;
    mockCtx.strokeRect(1, 1, width - 2, height - 2);
    
    // Add text content
    mockCtx.fillStyle = '#495057';
    mockCtx.textAlign = 'center';
    
    text.forEach((line, index) => {
      const fontSize = index === 0 ? 28 : 20;
      mockCtx.font = `${fontSize}px Arial, sans-serif`;
      const yPos = (height / 2) + (index * 35) - ((text.length - 1) * 17.5);
      mockCtx.fillText(line, width / 2, yPos);
    });
    
    const img = new Image();
    return new Promise((resolve) => {
      img.onload = () => {
        console.log('Mock image created successfully');
        resolve(img);
      };
      img.src = mockCanvas.toDataURL('image/png', 1.0);
    });
  }
}
