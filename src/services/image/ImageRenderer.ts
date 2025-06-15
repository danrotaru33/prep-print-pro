
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
    console.log(`Canvas setup: ${width}x${height}`);
  }

  async resizeAndPositionContent(
    img: HTMLImageElement,
    finalWidth: number,
    finalHeight: number,
    bleedPixels: number
  ): Promise<void> {
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
    
    console.log(`Scaled dimensions: ${scaledWidth}x${scaledHeight} (scale: ${scale.toFixed(3)})`);
    console.log(`Position: (${x.toFixed(1)}, ${y.toFixed(1)})`);
    
    // Set high quality scaling
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Draw the image
    this.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    console.log('Content drawn to canvas successfully');
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
