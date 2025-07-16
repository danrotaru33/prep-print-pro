import { supabase } from "@/integrations/supabase/client";

export interface OutpaintingResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  fallback?: boolean;
}

export class AIOutpaintingService {
  async outpaintImage(
    imageBlob: Blob,
    targetWidth: number,
    targetHeight: number,
    prompt: string = "Extend image naturally"
  ): Promise<OutpaintingResult> {
    try {
      console.log('[AIOutpaintingService] Starting AI outpainting request');
      console.log(`Target dimensions: ${targetWidth}x${targetHeight}`);
      console.log(`Prompt: ${prompt}`);

      // Prepare form data
      const formData = new FormData();
      formData.append('image', imageBlob, 'image.png');
      formData.append('width', targetWidth.toString());
      formData.append('height', targetHeight.toString());
      formData.append('prompt', prompt);

      // Call the Supabase edge function
      const { data, error } = await supabase.functions.invoke('hf-outpaint', {
        body: formData,
      });

      if (error) {
        console.error('[AIOutpaintingService] Supabase function error:', error);
        return {
          success: false,
          error: `AI outpainting failed: ${error.message}`,
          fallback: true
        };
      }

      if (!data.success) {
        console.error('[AIOutpaintingService] AI outpainting failed:', data.error);
        return {
          success: false,
          error: data.error || 'AI outpainting failed',
          fallback: data.fallback || true
        };
      }

      console.log('[AIOutpaintingService] AI outpainting completed successfully');
      return {
        success: true,
        imageUrl: data.imageUrl
      };

    } catch (error) {
      console.error('[AIOutpaintingService] Unexpected error:', error);
      return {
        success: false,
        error: `Unexpected error during AI outpainting: ${error instanceof Error ? error.message : String(error)}`,
        fallback: true
      };
    }
  }

  // Convert data URL to blob for further processing
  dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  // Convert blob to data URL for canvas operations
  blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}