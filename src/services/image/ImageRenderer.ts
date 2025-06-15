
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
    
    // Fill background
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, width, height);
  }

  async resizeAndPositionContent(
    img: HTMLImageElement,
    finalWidth: number,
    finalHeight: number,
    bleedPixels: number
  ): Promise<void> {
    console.log('Resizing and positioning content');
    
    // Calculate scaling to fit within final dimensions while maintaining aspect ratio
    const scaleX = finalWidth / img.width;
    const scaleY = finalHeight / img.height;
    const scale = Math.min(scaleX, scaleY);
    
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    
    // Center the content
    const x = bleedPixels + (finalWidth - scaledWidth) / 2;
    const y = bleedPixels + (finalHeight - scaledHeight) / 2;
    
    console.log(`Drawing image at ${x}, ${y} with dimensions ${scaledWidth}x${scaledHeight} (scale: ${scale})`);
    this.ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
  }

  async createMockImage(width: number, height: number, text: string[]): Promise<HTMLImageElement> {
    const mockCanvas = document.createElement('canvas');
    const mockCtx = mockCanvas.getContext('2d')!;
    
    mockCanvas.width = width;
    mockCanvas.height = height;
    
    // Create a simple mock content
    mockCtx.fillStyle = '#f0f0f0';
    mockCtx.fillRect(0, 0, width, height);
    
    mockCtx.fillStyle = '#333';
    mockCtx.font = '24px Arial';
    mockCtx.textAlign = 'center';
    
    text.forEach((line, index) => {
      mockCtx.fillText(line, width / 2, (height / 2) + (index * 40) - ((text.length - 1) * 20));
    });
    
    const img = new Image();
    return new Promise((resolve) => {
      img.onload = () => resolve(img);
      img.src = mockCanvas.toDataURL();
    });
  }
}
