
import { ProcessingParameters } from "@/types/print";

export const createPDFFromProcessedImage = async (
  processedImageUrl: string,
  parameters: ProcessingParameters
): Promise<Blob> => {
  console.log('Creating PDF from processed image');
  
  // Load the processed image to get its actual data
  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  return new Promise((resolve, reject) => {
    img.onload = async () => {
      try {
        // Create a canvas to convert the image to base64
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Convert to base64 JPEG
        const imageDataBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        const imageBytes = imageDataBase64.length;
        
        // Calculate PDF dimensions (convert mm to points: 1mm = 2.83465 points)
        const pdfWidth = parameters.finalDimensions.width * 2.83465;
        const pdfHeight = parameters.finalDimensions.height * 2.83465;
        
        // Create a proper PDF with the actual image
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
        
        console.log('PDF created with actual image data');
        resolve(new Blob([pdfContent], { type: 'application/pdf' }));
      } catch (error) {
        console.error('Error creating PDF:', error);
        reject(error);
      }
    };
    
    img.onerror = (error) => {
      console.error('Error loading processed image:', error);
      reject(new Error('Failed to load processed image'));
    };
    
    img.src = processedImageUrl;
  });
};
