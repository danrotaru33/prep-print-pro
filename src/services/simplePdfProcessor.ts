import jsPDF from 'jspdf';

export interface ProcessingParams {
  width: number;
  height: number;
  bleed: number;
  safeMargin: number;
}

export async function processImageToPDF(file: File, params: ProcessingParams): Promise<Blob> {
  const DPI = 300;
  const MM_TO_INCH = 1 / 25.4;
  
  // Calculate final dimensions in pixels
  const totalWidthMm = params.width + (params.bleed * 2);
  const totalHeightMm = params.height + (params.bleed * 2);
  const canvasWidth = Math.round(totalWidthMm * MM_TO_INCH * DPI);
  const canvasHeight = Math.round(totalHeightMm * MM_TO_INCH * DPI);
  
  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  // Fill with white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  
  // Load image
  const img = await loadImage(file);
  
  // Calculate content area (excluding bleed)
  const contentWidthPx = Math.round(params.width * MM_TO_INCH * DPI);
  const contentHeightPx = Math.round(params.height * MM_TO_INCH * DPI);
  const bleedPx = Math.round(params.bleed * MM_TO_INCH * DPI);
  
  // Calculate scale to fit content area while preserving aspect ratio
  const scaleX = contentWidthPx / img.width;
  const scaleY = contentHeightPx / img.height;
  const scale = Math.min(scaleX, scaleY);
  
  const scaledWidth = img.width * scale;
  const scaledHeight = img.height * scale;
  
  // Center the image within the content area
  const offsetX = bleedPx + (contentWidthPx - scaledWidth) / 2;
  const offsetY = bleedPx + (contentHeightPx - scaledHeight) / 2;
  
  // Draw image
  ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
  
  // Create PDF with exact dimensions
  const pdf = new jsPDF({
    unit: 'mm',
    format: [totalWidthMm, totalHeightMm],
    orientation: totalWidthMm > totalHeightMm ? 'landscape' : 'portrait'
  });
  
  // Convert canvas to image data and add to PDF
  const imageData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imageData, 'JPEG', 0, 0, totalWidthMm, totalHeightMm);
  
  return pdf.output('blob');
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    
    if (file.type === 'application/pdf') {
      // For PDF files, we'd need to extract the first page
      // For MVP, we'll handle this later or suggest using images
      reject(new Error('PDF processing not implemented in MVP'));
    } else {
      img.src = URL.createObjectURL(file);
    }
  });
}