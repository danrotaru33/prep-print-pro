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
    const hasAnyKey = hasOpenAI || hasHuggingFace;

    console.log(`[AI_CONFIG] OpenAI: ${hasOpenAI}, HuggingFace: ${hasHuggingFace}, Any: ${hasAnyKey}`);
    
    return { hasOpenAI, hasHuggingFace, hasAnyKey };
  }

  /**
   * Main inpainting logic with fast-fail and graceful degradation
   */
  static async tryAIInpainting(
    contextCanvas: HTMLCanvasElement,
    maskCanvas: HTMLCanvasElement,
    bleedPrompt?: string
  ): Promise<HTMLImageElement | null> {
    console.log('[AI_INPAINTING] Starting AI inpainting attempt...');
    
    const config = this.getApiConfiguration();
    
    // Fast-fail if no API keys are configured
    if (!config.hasAnyKey) {
      console.log('[AI_INPAINTING] No API keys configured, skipping AI inpainting');
      return null;
    }

    const imageBase64 = contextCanvas.toDataURL('image/png');
    const maskBase64 = maskCanvas.toDataURL('image/png');

    // Reduced timeout for faster failure
    const AI_TIMEOUT = 15000; // 15 seconds instead of 30

    // Try HuggingFace first if available (now primary)
    if (config.hasHuggingFace) {
      try {
        console.log('[AI_INPAINTING] Attempting HuggingFace LaMa (primary)...');
        const img = await this.withTimeout(
          this.callHuggingFaceLaMa(imageBase64, maskBase64, bleedPrompt),
          AI_TIMEOUT,
          "HuggingFace LaMa API"
        );
        if (img) {
          console.log('[AI_INPAINTING] HuggingFace success');
          return img;
        }
      } catch (error: any) {
        console.log('[AI_INPAINTING] HuggingFace failed:', error?.message || error);
      }
    }

    // Try OpenAI as fallback if available
    if (config.hasOpenAI) {
      try {
        console.log('[AI_INPAINTING] Attempting OpenAI DALL-E fallback...');
        const img = await this.withTimeout(
          this.callOpenAIInpainting(imageBase64, maskBase64, bleedPrompt),
          AI_TIMEOUT,
          "OpenAI DALL-E API"
        );
        if (img) {
          console.log('[AI_INPAINTING] OpenAI success');
          return img;
        }
      } catch (error: any) {
        console.log('[AI_INPAINTING] OpenAI failed:', error?.message || error);
      }
    }

    console.log('[AI_INPAINTING] All AI methods failed, returning null for fallback');
    return null;
  }

  static async callOpenAIInpainting(
    imageBase64: string,
    maskBase64: string,
    prompt?: string
  ): Promise<HTMLImageElement | null> {
    const openaiKey = localStorage.getItem('openai_api_key');
    if (!openaiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch('https://rvipdpzpeqbmdpavhojs.supabase.co/functions/v1/inpaint-openai', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}` // Pass the API key
        },
        body: JSON.stringify({
          image: imageBase64,
          mask: maskBase64,
          prompt: prompt || "extend the background content naturally, maintain style and colors"
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API failed (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'OpenAI inpainting failed');
      }
      
      const img = new Image();
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Image load timeout'));
        }, 8000); // Reduced timeout
        
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
    } catch (error) {
      console.error('[AI_OPENAI] Error:', error);
      return null;
    }
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
      const response = await fetch('https://rvipdpzpeqbmdpavhojs.supabase.co/functions/v1/inpaint-huggingface', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${huggingfaceKey}` // Pass the API key
        },
        body: JSON.stringify({
          image: imageBase64,
          mask: maskBase64,
          prompt
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HuggingFace API failed (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'HuggingFace inpainting failed');
      }
      
      const img = new Image();
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Image load timeout'));
        }, 8000); // Reduced timeout
        
        img.onload = () => {
          clearTimeout(timeoutId);
          resolve(img);
        };
        img.onerror = () => {
          reject(new Error('Failed to load AI result'));
        };
        img.src = data.result;
      });
    } catch (error) {
      console.error('[AI_HUGGINGFACE] Error:', error);
      return null;
    }
  }
}
