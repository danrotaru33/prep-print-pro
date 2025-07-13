
export class AIInpaintingService {
  /**
   * Helper: Ensures any async action resolves in X ms or rejects.
   */
  static async withTimeout<T>(promise: Promise<T>, ms: number, taskLabel: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        console.warn(`[AI_TIMEOUT] Task "${taskLabel}" timed out after ${ms}ms`);
        reject(new Error(`Timed out: ${taskLabel}`));
      }, ms);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  /**
   * Check if API keys are available and return configuration
   */
  static getApiConfiguration(): { hasOpenAI: boolean; hasHuggingFace: boolean; hasAnyKey: boolean } {
    const openaiKey = localStorage.getItem('openai_api_key');
    const huggingfaceKey = localStorage.getItem('huggingface_api_key');
    
    const hasOpenAI = !!(openaiKey && openaiKey.length > 0);
    const hasHuggingFace = !!(huggingfaceKey && huggingfaceKey.length > 0);
    const hasAnyKey = hasHuggingFace; // Only use HuggingFace now

    console.log(`[AI_CONFIG] HuggingFace (Primary): ${hasHuggingFace}, OpenAI (Disabled): ${hasOpenAI}, Any: ${hasAnyKey}`);
    
    return { hasOpenAI, hasHuggingFace, hasAnyKey };
  }

  /**
   * Main inpainting logic with HuggingFace as primary (OpenAI disabled)
   */
  static async tryAIInpainting(
    contextCanvas: HTMLCanvasElement,
    maskCanvas: HTMLCanvasElement,
    bleedPrompt?: string
  ): Promise<HTMLImageElement | null> {
    console.log('[AI_INPAINTING] Starting AI inpainting...');
    
    const config = this.getApiConfiguration();
    
    // Fast-fail if no HuggingFace API key is configured
    if (!config.hasHuggingFace) {
      console.log('[AI_INPAINTING] No HuggingFace API key configured, using fallback');
      return null;
    }

    try {
      const imageBase64 = contextCanvas.toDataURL('image/png');
      const maskBase64 = maskCanvas.toDataURL('image/png');

      console.log('[AI_INPAINTING] Calling HuggingFace LaMa...');
      const img = await this.callHuggingFaceLaMa(imageBase64, maskBase64, bleedPrompt);
      if (img) {
        console.log('[AI_INPAINTING] HuggingFace success');
        return img;
      }
    } catch (error: any) {
      console.warn('[AI_INPAINTING] HuggingFace failed:', error?.message || error);
    }

    console.log('[AI_INPAINTING] AI processing failed, using fallback');
    return null;
  }

  static async callOpenAIInpainting(
    imageBase64: string,
    maskBase64: string,
    prompt?: string
  ): Promise<HTMLImageElement | null> {
    // OpenAI is now disabled
    console.log('[AI_OPENAI] OpenAI is disabled in favor of HuggingFace');
    return null;
  }

  static async callHuggingFaceLaMa(
    imageBase64: string,
    maskBase64: string,
    prompt?: string
  ): Promise<HTMLImageElement | null> {
    const huggingfaceKey = localStorage.getItem('huggingface_api_key');
    if (!huggingfaceKey) {
      throw new Error('HuggingFace API key not configured');
    }

    try {
      // 10 second timeout for the entire operation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('https://rvipdpzpeqbmdpavhojs.supabase.co/functions/v1/inpaint-huggingface', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2aXBkcHpwZXFibWRwYXZob2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjU5OTIsImV4cCI6MjA2NTUwMTk5Mn0.kq-csmvMYb5shzVY30VxKHAwDQlyu0k7-vYGoylymG8',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2aXBkcHpwZXFibWRwYXZob2pzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5MjU5OTIsImV4cCI6MjA2NTUwMTk5Mn0.kq-csmvMYb5shzVY30VxKHAwDQlyu0k7-vYGoylymG8`
        },
        body: JSON.stringify({
          image: imageBase64,
          mask: maskBase64,
          prompt
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Edge function failed (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'HuggingFace inpainting failed');
      }
      
      // Load image with timeout
      const img = new Image();
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Image load timeout'));
        }, 5000);
        
        img.onload = () => {
          clearTimeout(timeoutId);
          resolve(img);
        };
        img.onerror = () => {
          clearTimeout(timeoutId);
          reject(new Error('Failed to load AI result'));
        };
        img.src = data.result;
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('AI processing timeout (10s)');
      }
      console.error('[AI_HUGGINGFACE] Error:', error);
      throw error;
    }
  }
}
