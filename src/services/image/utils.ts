
export const mmToPixels = (mm: number, dpi: number): number => {
  return Math.round((mm * dpi) / 25.4);
};

export const canvasToDataURL = async (canvas: HTMLCanvasElement): Promise<string> => {
  return canvas.toDataURL('image/png', 1.0);
};
