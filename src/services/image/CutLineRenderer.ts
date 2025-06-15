
import { ProcessingParameters } from "@/types/print";

/**
 * Responsible for rendering cut lines on the processed image canvas.
 */
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

    // Set style for pure magenta, solid line
    this.ctx.strokeStyle = '#FF00FF';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([]); // Solid (undashed) line

    const x = bleedPixels;
    const y = bleedPixels;

    this.ctx.beginPath();
    if (parameters.cutLineType === 'rectangle') {
      // Draw a rectangle (no squares in corners)
      this.ctx.strokeRect(x, y, finalWidth, finalHeight);
    } else if (parameters.cutLineType === 'circle') {
      // Draw a circle as the cut line
      const centerX = x + finalWidth / 2;
      const centerY = y + finalHeight / 2;
      const radius = Math.min(finalWidth, finalHeight) / 2;
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.stroke();
    }
    // No other operations: do *not* draw any filled shapes or squares.
    this.ctx.closePath();
  }
}
