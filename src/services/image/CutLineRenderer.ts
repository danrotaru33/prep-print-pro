
import { ProcessingParameters } from "@/types/print";

export class CutLineRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  addCutLines(
    parameters: ProcessingParameters,
    finalWidth: number,
    finalHeight: number,
    bleedPixels: number
  ): void {
    console.log('Adding cut lines:', parameters.cutLineType);
    
    this.ctx.strokeStyle = '#FF0000'; // Red cut lines
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]); // Dashed line
    
    const x = bleedPixels;
    const y = bleedPixels;
    
    if (parameters.cutLineType === 'rectangle') {
      // Draw rectangle cut lines
      this.ctx.strokeRect(x, y, finalWidth, finalHeight);
    } else if (parameters.cutLineType === 'circle') {
      // Draw circle cut lines
      const centerX = x + finalWidth / 2;
      const centerY = y + finalHeight / 2;
      const radius = Math.min(finalWidth, finalHeight) / 2;
      
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
    
    // Reset line dash
    this.ctx.setLineDash([]);
  }
}
