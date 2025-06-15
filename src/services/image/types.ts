
export interface ProcessingResult {
  processedImageUrl: string;
  originalDimensions: { width: number; height: number };
  finalDimensions: { width: number; height: number };
  appliedBleed: number;
}

export interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}
