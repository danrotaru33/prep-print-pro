import { ProcessingParameters, UploadedFile } from "@/types/print";
import { ProcessingResult, CanvasContext } from "./types";
import { PDFProcessor } from "./PDFProcessor";
import { ImageRenderer } from "./ImageRenderer";
import { BleedProcessor } from "./BleedProcessor";
import { CutLineRenderer } from "./CutLineRenderer";
import { mmToPixels, canvasToDataURL } from "./utils";

export class ImageProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private imageRenderer: ImageRenderer;
  private pdfProcessor: PDFProcessor;
  private bleedProcessor: BleedProcessor;
  private cutLineRenderer: CutLineRenderer;

  constructor() {
    this.canvas = document.createElement('canvas');
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }
    this.ctx = context;

    const canvasContext: CanvasContext = { canvas: this.canvas, ctx: this.ctx };
    this.imageRenderer = new ImageRenderer(canvasContext);
    this.pdfProcessor = new PDFProcessor(this.imageRenderer);
    this.bleedProcessor = new BleedProcessor(this.ctx, this.canvas);
    this.cutLineRenderer = new CutLineRenderer(this.ctx);
  }

  async processFile(file: UploadedFile, parameters: ProcessingParameters): Promise<ProcessingResult> {
    console.log('Starting image processing with parameters:', parameters);
    console.log('File info:', { name: file.file.name, type: file.type, size: file.file.size });
    
    if (file.type === 'pdf') {
      console.log('Processing as PDF file');
      const img = await this.pdfProcessor.processPDF(file, parameters);
      console.log('PDF processed, now processing image data');
      return this.processImageData(img, parameters);
    } else {
      console.log('Processing as image file');
      return this.processImage(file, parameters);
    }
  }

  private async processImage(file: UploadedFile, parameters: ProcessingParameters): Promise<ProcessingResult> {
    console.log('Processing image file');
    
    const img = new Image();
    const imageUrl = URL.createObjectURL(file.file);
    
    return new Promise((resolve, reject) => {
      img.onload = async () => {
        try {
          console.log(`Image loaded: ${img.width}x${img.height}`);
          const result = await this.processImageData(img, parameters);
          URL.revokeObjectURL(imageUrl);
          resolve(result);
        } catch (error) {
          console.error('Error processing image data:', error);
          URL.revokeObjectURL(imageUrl);
          reject(error);
        }
      };
      img.onerror = () => {
        console.error('Failed to load image');
        URL.revokeObjectURL(imageUrl);
        reject(new Error('Failed to load image'));
      };
      img.src = imageUrl;
    });
  }

  private async processImageData(img: HTMLImageElement, parameters: ProcessingParameters): Promise<ProcessingResult> {
    const originalDimensions = { width: img.width, height: img.height };
    console.log('Processing image data. Original dimensions:', originalDimensions);
    
    // Calculate dimensions with bleed
    const finalWidth = this.mmToPixels(parameters.finalDimensions.width, parameters.dpi);
    const finalHeight = this.mmToPixels(parameters.finalDimensions.height, parameters.dpi);
    const bleedPixels = this.mmToPixels(parameters.bleedMargin, parameters.dpi);
    
    const canvasWidth = finalWidth + (bleedPixels * 2);
    const canvasHeight = finalHeight + (bleedPixels * 2);
    
    console.log(`Final dimensions: ${finalWidth}x${finalHeight}px (${parameters.finalDimensions.width}x${parameters.finalDimensions.height}mm at ${parameters.dpi}DPI)`);
    console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight}px (includes ${bleedPixels}px bleed on each side)`);
    
    // Set up canvas
    this.imageRenderer.setupCanvas(canvasWidth, canvasHeight);
    
    // Resize and position the main content
    console.log('Starting content positioning...');
    await this.imageRenderer.resizeAndPositionContent(img, finalWidth, finalHeight, bleedPixels);
    
    // Extend bleed areas
    console.log('Extending bleed areas...');
    await this.bleedProcessor.extendBleedAreas(bleedPixels, finalWidth, finalHeight);
    
    // Add cut lines
    console.log('Adding cut lines...');
    this.cutLineRenderer.addCutLines(parameters, finalWidth, finalHeight, bleedPixels);
    
    // Convert to blob and create URL
    console.log('Converting canvas to data URL...');
    const processedImageUrl = await this.canvasToDataURL(this.canvas);
    
    console.log('Image processing complete');
    return {
      processedImageUrl,
      originalDimensions,
      finalDimensions: { width: canvasWidth, height: canvasHeight },
      appliedBleed: parameters.bleedMargin
    };
  }

  private mmToPixels(mm: number, dpi: number): number {
    return Math.round((mm * dpi) / 25.4);
  }

  private async canvasToDataURL(canvas: HTMLCanvasElement): Promise<string> {
    return canvas.toDataURL('image/png', 1.0);
  }

  destroy() {
    // Clean up resources
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
