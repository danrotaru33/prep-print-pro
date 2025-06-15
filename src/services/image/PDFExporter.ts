
import { ProcessingParameters } from "@/types/print";

export const createPDFFromProcessedImage = async (
  processedImageUrl: string,
  parameters: ProcessingParameters
): Promise<Blob> => {
  console.log('Creating PDF from processed image URL:', processedImageUrl);
  
  // Load the processed image to get its actual data
  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  return new Promise((resolve, reject) => {
    img.onload = async () => {
      try {
        console.log(`Loaded processed image: ${img.width}x${img.height}`);
        
        // Create a canvas to convert the image to base64
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the processed image (with bleed and cut lines) to canvas
        ctx.drawImage(img, 0, 0);
        
        // Convert to base64 JPEG with high quality
        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        const imageDataBase64 = imageDataUrl.split(',')[1];
        const imageBytes = atob(imageDataBase64).length;
        
        console.log(`Image converted to base64, size: ${imageBytes} bytes`);
        
        // Calculate PDF dimensions (convert mm to points: 1mm = 2.83465 points)
        const pdfWidth = parameters.finalDimensions.width * 2.83465;
        const pdfHeight = parameters.finalDimensions.height * 2.83465;
        
        console.log(`PDF dimensions: ${pdfWidth.toFixed(2)} x ${pdfHeight.toFixed(2)} points`);
        
        // Create PDF with the actual processed image
        const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 ${pdfWidth.toFixed(2)} ${pdfHeight.toFixed(2)}]
/Contents 4 0 R
/Resources <<
  /XObject <<
    /Im1 5 0 R
  >>
>>
>>
endobj

4 0 obj
<<
/Length 58
>>
stream
q
${pdfWidth.toFixed(2)} 0 0 ${pdfHeight.toFixed(2)} 0 0 cm
/Im1 Do
Q
endstream
endobj

5 0 obj
<<
/Type /XObject
/Subtype /Image
/Width ${img.width}
/Height ${img.height}
/ColorSpace /DeviceRGB
/BitsPerComponent 8
/Filter /DCTDecode
/Length ${imageBytes}
>>
stream
${imageDataBase64}
endstream
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000398 00000 n 
0000000507 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
${800 + imageBytes}
%%EOF`;
        
        console.log('PDF created successfully with processed image data');
        resolve(new Blob([pdfContent], { type: 'application/pdf' }));
      } catch (error) {
        console.error('Error creating PDF:', error);
        reject(error);
      }
    };
    
    img.onerror = (error) => {
      console.error('Error loading processed image for PDF creation:', error);
      reject(new Error('Failed to load processed image for PDF creation'));
    };
    
    img.src = processedImageUrl;
  });
};
