
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
    console.log('=== PDF PROCESSING START ===');
    console.log('Processing PDF file:', file.file.name);
    
    try {
      // Convert file to ArrayBuffer for PDF.js
      const arrayBuffer = await file.file.arrayBuffer();
      console.log('PDF file converted to ArrayBuffer, size:', arrayBuffer.byteLength);
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('PDF file appears to be empty');
      }
      
      // Load the PDF document with better error handling
      console.log('Loading PDF document...');
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        verbosity: 0, // Reduce PDF.js logging
        standardFontDataUrl: `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`
      });
      
      const pdf = await loadingTask.promise;
      console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      if (pdf.numPages === 0) {
        throw new Error('PDF has no pages');
      }
      
      // Get the first page
      console.log('Getting first page...');
      const page = await pdf.getPage(1);
      console.log('PDF page loaded successfully');
      
      // Get the viewport for the page - use higher scale for better quality
      const scale = 2.0; // Reduced from 3.0 for better compatibility
      const viewport = page.getViewport({ scale });
      console.log(`PDF viewport: ${viewport.width}x${viewport.height} at scale ${scale}`);
      
      if (viewport.width === 0 || viewport.height === 0) {
        throw new Error('PDF page has invalid dimensions');
      }
      
      // Create a canvas for the PDF page
      const pdfCanvas = document.createElement('canvas');
      const pdfContext = pdfCanvas.getContext('2d');
      if (!pdfContext) {
        throw new Error('Failed to get PDF canvas context');
      }
      
      pdfCanvas.width = Math.floor(viewport.width);
      pdfCanvas.height = Math.floor(viewport.height);
      console.log(`Canvas dimensions set to: ${pdfCanvas.width}x${pdfCanvas.height}`);
      
      // Set white background for the PDF canvas
      pdfContext.fillStyle = '#FFFFFF';
      pdfContext.fillRect(0, 0, pdfCanvas.width, pdfCanvas.height);
      console.log('Canvas background set to white');
      
      // Render the PDF page to the canvas with timeout
      const renderContext = {
        canvasContext: pdfContext,
        viewport: viewport,
        background: 'white'
      };
      
      console.log('Starting PDF page render...');
      
      // Add timeout to prevent hanging
      const renderPromise = page.render(renderContext).promise;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('PDF render timeout after 30 seconds')), 30000);
      });
      
      await Promise.race([renderPromise, timeoutPromise]);
      console.log('PDF page rendered to canvas successfully');
      
      // Verify canvas has content
      const imageData = pdfContext.getImageData(0, 0, Math.min(pdfCanvas.width, 100), Math.min(pdfCanvas.height, 100));
      const hasContent = this.verifyCanvasContent(imageData);
      console.log('Canvas content verification:', hasContent);
      
      if (!hasContent) {
        throw new Error('PDF rendered to blank canvas');
      }
      
      // Convert the PDF canvas to an image
      const img = new Image();
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Image load timeout'));
        }, 10000);
        
        img.onload = () => {
          clearTimeout(timeoutId);
          console.log(`PDF converted to image: ${img.width}x${img.height}`);
          console.log('=== PDF PROCESSING SUCCESS ===');
          resolve(img);
        };
        
        img.onerror = (error) => {
          clearTimeout(timeoutId);
          console.error('Failed to load PDF as image:', error);
          reject(new Error('Failed to load PDF as image'));
        };
        
        // Use high quality settings
        const dataUrl = pdfCanvas.toDataURL('image/png', 1.0);
        console.log('Canvas converted to data URL, length:', dataUrl.length);
        
        if (dataUrl.length < 1000) {
          reject(new Error('Generated data URL is too small'));
          return;
        }
        
        img.src = dataUrl;
      });
      
    } catch (error) {
      console.error('=== PDF PROCESSING ERROR ===');
      console.error('Error processing PDF:', error);
      
      // Provide more detailed error logging
      if (error instanceof Error) {
        console.error('PDF processing error details:', error.message, error.stack);
      }
      
      // Instead of falling back to mock, throw the error to be handled upstream
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private verifyCanvasContent(imageData: ImageData): boolean {
    const { data } = imageData;
    let nonWhitePixels = 0;
    
    // Check if any pixels are significantly different from white
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // If we find any non-white pixel with reasonable alpha
      if (a > 128 && (r < 240 || g < 240 || b < 240)) {
        nonWhitePixels++;
      }
    }
    
    console.log('Non-white pixels found:', nonWhitePixels);
    return nonWhitePixels > 10; // Need at least 10 non-white pixels to consider it valid content
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
