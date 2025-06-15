
import * as pdfjsLib from 'pdfjs-dist';
import { UploadedFile, ProcessingParameters } from "@/types/print";
import { ImageRenderer } from "./ImageRenderer";

export class PDFProcessor {
  private imageRenderer: ImageRenderer;
  private workerInitialized: boolean = false;

  constructor(imageRenderer: ImageRenderer) {
    this.imageRenderer = imageRenderer;
  }

  private async initializeWorker(): Promise<void> {
    if (this.workerInitialized) return;
    
    try {
      console.log('Initializing PDF.js worker...');
      
      // Try multiple worker sources for better reliability
      const workerSources = [
        // Use npm package worker first (most reliable)
        new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).href,
        // Fallback to jsdelivr CDN
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`,
        // Last resort: cloudflare CDN
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
      ];
      
      for (const workerSrc of workerSources) {
        try {
          console.log('Trying worker source:', workerSrc);
          pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
          
          // Test if worker loads by creating a simple document
          const testData = new Uint8Array([
            0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25, 0xC4, 0xE5, 0xF2, 0xE5, 0xEB, 0xA7, 0xF3, 0xA0, 0xD0, 0xC4, 0xC6, 0x0A
          ]);
          
          const loadingTask = pdfjsLib.getDocument({ data: testData });
          await Promise.race([
            loadingTask.promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Worker test timeout')), 3000))
          ]);
          
          console.log('PDF.js worker initialized successfully with source:', workerSrc);
          this.workerInitialized = true;
          return;
        } catch (error) {
          console.warn(`Failed to initialize worker with ${workerSrc}:`, error);
          continue;
        }
      }
      
      throw new Error('All PDF.js worker sources failed to load');
    } catch (error) {
      console.error('Failed to initialize PDF.js worker:', error);
      throw new Error('PDF.js worker initialization failed. Please check your internet connection.');
    }
  }

  async processPDF(file: UploadedFile, parameters: ProcessingParameters): Promise<HTMLImageElement> {
    console.log('=== PDF PROCESSING START ===');
    console.log('Processing PDF file:', file.file.name);
    
    try {
      // Initialize worker first
      await this.initializeWorker();
      
      // Convert file to ArrayBuffer for PDF.js
      const arrayBuffer = await file.file.arrayBuffer();
      console.log('PDF file converted to ArrayBuffer, size:', arrayBuffer.byteLength);
      
      if (arrayBuffer.byteLength === 0) {
        throw new Error('PDF file appears to be empty');
      }
      
      // Load the PDF document with better configuration
      console.log('Loading PDF document...');
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        verbosity: 0,
        useWorkerFetch: false, // Disable worker fetch to avoid network issues
        isEvalSupported: false, // Disable eval for security
        disableFontFace: false, // Keep fonts enabled for better rendering
        useSystemFonts: true // Use system fonts as fallback
      });
      
      // Add timeout to prevent hanging - properly type the result
      const pdfPromise = loadingTask.promise;
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF loading timeout after 30 seconds')), 30000);
      });
      
      const pdf = await Promise.race([pdfPromise, timeoutPromise]);
      console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      if (pdf.numPages === 0) {
        throw new Error('PDF has no pages');
      }
      
      // Get the first page
      console.log('Getting first page...');
      const page = await pdf.getPage(1);
      console.log('PDF page loaded successfully');
      
      // Get the viewport for the page - use scale for good quality
      const scale = 2.0;
      const viewport = page.getViewport({ scale });
      console.log(`PDF viewport: ${viewport.width}x${viewport.height} at scale ${scale}`);
      
      if (viewport.width === 0 || viewport.height === 0) {
        throw new Error('PDF page has invalid dimensions');
      }
      
      // Create a canvas for the PDF page
      const pdfCanvas = document.createElement('canvas');
      const pdfContext = pdfCanvas.getContext('2d', {
        alpha: false, // Disable alpha for better performance
        willReadFrequently: true // Optimize for frequent reading
      });
      
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
        background: 'white',
        intent: 'display' // Optimize for display
      };
      
      console.log('Starting PDF page render...');
      
      // Add timeout to prevent hanging - properly type the result
      const renderPromise = page.render(renderContext).promise;
      const renderTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PDF render timeout after 45 seconds')), 45000);
      });
      
      await Promise.race([renderPromise, renderTimeoutPromise]);
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
        }, 15000);
        
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
        
        // Use high quality settings with better compression
        const dataUrl = pdfCanvas.toDataURL('image/png', 0.95);
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
      
      // Provide more detailed error information
      let errorMessage = 'PDF processing failed';
      if (error instanceof Error) {
        if (error.message.includes('worker') || error.message.includes('fetch')) {
          errorMessage = 'PDF.js worker loading failed. Please check your internet connection and try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'PDF processing took too long. The file might be too complex or large.';
        } else {
          errorMessage = `PDF processing failed: ${error.message}`;
        }
      }
      
      throw new Error(errorMessage);
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
}
