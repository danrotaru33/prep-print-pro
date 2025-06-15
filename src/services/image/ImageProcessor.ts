
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
    
    if (file.type === 'pdf') {
      const img = await this.pdfProcessor.processPDF(file, parameters);
      return this.processImageData(img, parameters);
    } else {
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
          const result = await this.processImageData(img, parameters);
          URL.revokeObjectURL(imageUrl);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  }

  private async processImageData(img: HTMLImageElement, parameters: ProcessingParameters): Promise<ProcessingResult> {
    const originalDimensions = { width: img.width, height: img.height };
    console.log('Processing image data. Original dimensions:', originalDimensions);
    
    // Calculate dimensions with bleed
    const finalWidth = mmToPixels(parameters.finalDimensions.width, parameters.dpi);
    const finalHeight = mmToPixels(parameters.finalDimensions.height, parameters.dpi);
    const bleedPixels = mmToPixels(parameters.bleedMargin, parameters.dpi);
    
    const canvasWidth = finalWidth + (bleedPixels * 2);
    const canvasHeight = finalHeight + (bleedPixels * 2);
    
    console.log(`Canvas dimensions: ${canvasWidth}x${canvasHeight} (${finalWidth}x${finalHeight} + ${bleedPixels}px bleed)`);
    
    // Set up canvas
    this.imageRenderer.setupCanvas(canvasWidth, canvasHeight);
    
    // Resize and position the main content
    await this.imageRenderer.resizeAndPositionContent(img, finalWidth, finalHeight, bleedPixels);
    
    // Extend bleed areas
    await this.bleedProcessor.extendBleedAreas(bleedPixels, finalWidth, finalHeight);
    
    // Add cut lines
    this.cutLineRenderer.addCutLines(parameters, finalWidth, finalHeight, bleedPixels);
    
    // Convert to blob and create URL
    const processedImageUrl = await canvasToDataURL(this.canvas);
    
    return {
      processedImageUrl,
      originalDimensions,
      finalDimensions: { width: canvasWidth, height: canvasHeight },
      appliedBleed: parameters.bleedMargin
    };
  }

  destroy() {
    // Clean up resources
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}
