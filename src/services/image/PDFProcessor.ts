
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
      console.log('PDF file converted to ArrayBuffer, size:', arrayBuffer.byteLength);
      
      // Load the PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      // Get the first page (you could modify this to handle multiple pages)
      const page = await pdf.getPage(1);
      console.log('PDF page loaded');
      
      // Get the viewport for the page - use higher scale for better quality
      const scale = 3.0; // Increased scale for better quality
      const viewport = page.getViewport({ scale });
      console.log(`PDF viewport: ${viewport.width}x${viewport.height} at scale ${scale}`);
      
      // Create a canvas for the PDF page
      const pdfCanvas = document.createElement('canvas');
      const pdfContext = pdfCanvas.getContext('2d');
      if (!pdfContext) {
        throw new Error('Failed to get PDF canvas context');
      }
      
      pdfCanvas.width = viewport.width;
      pdfCanvas.height = viewport.height;
      
      // Set white background for the PDF canvas
      pdfContext.fillStyle = '#FFFFFF';
      pdfContext.fillRect(0, 0, viewport.width, viewport.height);
      
      // Render the PDF page to the canvas
      const renderContext = {
        canvasContext: pdfContext,
        viewport: viewport
      };
      
      console.log('Starting PDF page render...');
      await page.render(renderContext).promise;
      console.log('PDF page rendered to canvas successfully');
      
      // Convert the PDF canvas to an image
      const img = new Image();
      return new Promise((resolve, reject) => {
        img.onload = () => {
          console.log(`PDF converted to image: ${img.width}x${img.height}`);
          resolve(img);
        };
        img.onerror = (error) => {
          console.error('Failed to load PDF as image:', error);
          reject(new Error('Failed to load PDF as image'));
        };
        // Use high quality settings
        img.src = pdfCanvas.toDataURL('image/png', 1.0);
      });
      
    } catch (error) {
      console.error('Error processing PDF:', error);
      // Provide more detailed error logging
      if (error instanceof Error) {
        console.error('PDF processing error details:', error.message, error.stack);
      }
      // Fallback to mock if PDF processing fails
      console.log('Falling back to mock PDF processing');
      return this.createMockImageFromPDF(file, parameters);
    }
  }

  private async createMockImageFromPDF(file: UploadedFile, parameters: ProcessingParameters): Promise<HTMLImageElement> {
    console.log('Creating mock image for PDF fallback');
    const mockText = [
      'PDF Content (Processing Failed)',
      `File: ${file.file.name}`,
      `Size: ${Math.round(file.file.size / 1024)}KB`,
      `Target: ${parameters.finalDimensions.width}×${parameters.finalDimensions.height}mm`,
      'PDF.js processing encountered an error'
    ];
    
    return this.imageRenderer.createMockImage(800, 600, mockText);
  }
}
