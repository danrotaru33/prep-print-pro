import jsPDF from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';

// Use a simpler approach - skip PDF.js worker for now
// pdfjsLib.GlobalWorkerOptions.workerSrc = null;

export interface ProcessingParams {
  width: number;
  height: number;
  bleed: number;
  safeMargin: number;
}

export async function processImageToPDF(file: File, params: ProcessingParams): Promise<Blob> {
  const DPI = 300; // Fixed 300 DPI as required
  const MM_TO_INCH = 1 / 25.4;
  
  // Calculate final dimensions in pixels (including bleed)
  const totalWidthMm = params.width + (params.bleed * 2);
  const totalHeightMm = params.height + (params.bleed * 2);
  const canvasWidth = Math.round(totalWidthMm * MM_TO_INCH * DPI);
  const canvasHeight = Math.round(totalHeightMm * MM_TO_INCH * DPI);
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Fill with white background (white padding as required)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Load image (handles both images and PDFs)
  const img = await loadImage(file);
  
  // Calculate dimensions in pixels
  const bleedPx = Math.round(params.bleed * MM_TO_INCH * DPI);
  const safeMarginPx = Math.round(params.safeMargin * MM_TO_INCH * DPI);
  
  // Calculate the trim area (final output without bleed)
  const trimWidthPx = Math.round(params.width * MM_TO_INCH * DPI);
  const trimHeightPx = Math.round(params.height * MM_TO_INCH * DPI);
  
  // Calculate the safe area (trim area minus safe margins)
  const safeWidthPx = trimWidthPx - (safeMarginPx * 2);
  const safeHeightPx = trimHeightPx - (safeMarginPx * 2);
  
  // Scale image to fit within the safe area, preserving aspect ratio
  const scaleX = safeWidthPx / img.width;
  const scaleY = safeHeightPx / img.height;
  const scale = Math.min(scaleX, scaleY);
  
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  
  // Center the image within the trim area (which is offset by bleed from canvas edge)
  const trimOffsetX = bleedPx;
  const trimOffsetY = bleedPx;
  const imageOffsetX = trimOffsetX + (trimWidthPx - scaledWidth) / 2;
  const imageOffsetY = trimOffsetY + (trimHeightPx - scaledHeight) / 2;
  
  // Draw image centered on canvas
  ctx.drawImage(img, imageOffsetX, imageOffsetY, scaledWidth, scaledHeight);
  
  // Create PDF with exact output dimensions (final size + bleed) at 300 DPI
  const pdf = new jsPDF({
    unit: 'mm',
    format: [totalWidthMm, totalHeightMm],
    orientation: totalWidthMm > totalHeightMm ? 'landscape' : 'portrait'
  });
  
  // Convert canvas to high-quality image data and add to PDF
  const imageData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imageData, 'JPEG', 0, 0, totalWidthMm, totalHeightMm);
  
  return pdf.output('blob');
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise(async (resolve, reject) => {
    try {
      if (file.type === 'application/pdf') {
        // For now, reject PDF processing to avoid worker issues
        throw new Error('PDF processing temporarily disabled. Please upload an image file instead.');
      } else {
        // Handle regular image files
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      }
    } catch (error) {
      reject(error);
    }
  });
}

async function extractImageFromPDF(file: File): Promise<HTMLImageElement> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Get the first page
    const page = await pdf.getPage(1);
    
    // Set a reasonable scale for high quality
    const viewport = page.getViewport({ scale: 2.0 });
    
    // Create canvas to render PDF page
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    // Convert canvas to image
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = canvas.toDataURL('image/png');
    });
  } catch (error) {
    throw new Error(`Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}