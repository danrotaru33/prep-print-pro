
export interface MarginArea {
  type: 'top' | 'bottom' | 'left' | 'right';
  x: number;
  y: number;
  width: number;
  height: number;
  contextX: number;
  contextY: number;
  contextWidth: number;
  contextHeight: number;
}

export class MarginAreaExtractor {
  static extractAllBleedMarginAreas(
    bleedPixels: number,
    finalWidth: number,
    finalHeight: number
  ): MarginArea[] {
    const areas: MarginArea[] = [];
    const CONTEXT_SLICE_PIXELS = Math.max(120, Math.floor(Math.min(finalWidth, finalHeight) / 3));
    const canvasWidth = finalWidth + bleedPixels * 2;
    const canvasHeight = finalHeight + bleedPixels * 2;

    areas.push({
      type: 'top',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: bleedPixels,
      contextX: 0,
      contextY: bleedPixels,
      contextWidth: canvasWidth,
      contextHeight: Math.min(CONTEXT_SLICE_PIXELS, finalHeight),
    });
    areas.push({
      type: 'bottom',
      x: 0,
      y: bleedPixels + finalHeight,
      width: canvasWidth,
      height: bleedPixels,
      contextX: 0,
      contextY: bleedPixels + finalHeight - Math.min(CONTEXT_SLICE_PIXELS, finalHeight),
      contextWidth: canvasWidth,
      contextHeight: Math.min(CONTEXT_SLICE_PIXELS, finalHeight),
    });
    areas.push({
      type: 'left',
      x: 0,
      y: bleedPixels,
      width: bleedPixels,
      height: finalHeight,
      contextX: bleedPixels,
      contextY: bleedPixels,
      contextWidth: Math.min(CONTEXT_SLICE_PIXELS, finalWidth),
      contextHeight: finalHeight,
    });
    areas.push({
      type: 'right',
      x: bleedPixels + finalWidth,
      y: bleedPixels,
      width: bleedPixels,
      height: finalHeight,
      contextX: bleedPixels + finalWidth - Math.min(CONTEXT_SLICE_PIXELS, finalWidth),
      contextY: bleedPixels,
      contextWidth: Math.min(CONTEXT_SLICE_PIXELS, finalWidth),
      contextHeight: finalHeight,
    });

    return areas;
  }
}

