
import * as pdfjsLib from 'pdfjs-dist';
import { UploadedFile, ProcessingParameters } from "@/types/print";
import { ImageRenderer } from "./ImageRenderer";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class PDFProcessor {
  private imageRenderer: ImageRenderer;

  constructor(imageRenderer: ImageRenderer) {
    this.imageRenderer = imageRenderer;
  }

  async processPDF(file: UploadedFile, parameters: ProcessingParameters): Promise<HTMLImageElement> {
    console.log('Processing PDF file - extracting actual content');
    
    try {
      // Convert file to ArrayBuffer for PDF.js
      const arrayBuffer = await file.file.arrayBuffer();
      
      // Load the PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      // Get the first page (you could modify this to handle multiple pages)
      const page = await pdf.getPage(1);
      
      // Get the viewport for the page
      const viewport = page.getViewport({ scale: 2.0 }); // Use 2x scale for better quality
      
      // Create a canvas for the PDF page
      const pdfCanvas = document.createElement('canvas');
      const pdfContext = pdfCanvas.getContext('2d');
      if (!pdfContext) {
        throw new Error('Failed to get PDF canvas context');
      }
      
      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;
      
      // Render the PDF page to the canvas
      const renderContext = {
        canvasContext: pdfContext,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      console.log('PDF page rendered to canvas');
      
      // Convert the PDF canvas to an image
      const img = new Image();
      return new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load PDF as image'));
        img.src = pdfCanvas.toDataURL();
      });
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      // Fallback to mock if PDF processing fails
      console.log('Falling back to mock PDF processing');
      return this.createMockImageFromPDF(file, parameters);
    }
  }

  private async createMockImageFromPDF(file: UploadedFile, parameters: ProcessingParameters): Promise<HTMLImageElement> {
    const mockText = [
      'PDF Content (Fallback)',
      `${parameters.finalDimensions.width}×${parameters.finalDimensions.height}mm`,
      'PDF.js processing failed'
    ];
    
    return this.imageRenderer.createMockImage(800, 600, mockText);
  }
}
