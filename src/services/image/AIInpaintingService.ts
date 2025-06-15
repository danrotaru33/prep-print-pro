
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
   * Main inpainting logic, with first-OpenAI then HuggingFace fallback.
   */
  static async tryAIInpainting(
    contextCanvas: HTMLCanvasElement,
    maskCanvas: HTMLCanvasElement,
    bleedPrompt?: string
  ): Promise<HTMLImageElement | null> {
    console.log('Attempting AI inpainting, preferring OpenAI DALL-E first...');
    const imageBase64 = contextCanvas.toDataURL('image/png');
    const maskBase64 = maskCanvas.toDataURL('image/png');

    // Try OpenAI
    try {
      const img = await this.withTimeout(
        this.callOpenAIInpainting(imageBase64, maskBase64, bleedPrompt),
        30000,
        "OpenAI DALL-E API"
      );
      if (img) return img;
    } catch (error: any) {
      console.log('OpenAI DALL-E failed or timed out:', error?.message || error);
    }

    // Fallback to HuggingFace LaMa
    try {
      const img = await this.withTimeout(
        this.callHuggingFaceLaMa(imageBase64, maskBase64, bleedPrompt),
        30000,
        "HuggingFace LaMa API"
      );
      if (img) return img;
    } catch (error: any) {
      console.log('HuggingFace LaMa (fallback) failed or timed out:', error?.message || error);
    }

    return null;
  }

  static async callOpenAIInpainting(
    imageBase64: string,
    maskBase64: string,
    prompt?: string
  ): Promise<HTMLImageElement | null> {
    try {
      const response = await fetch('https://rvipdpzpeqbmdpavhojs.supabase.co/functions/v1/inpaint-openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          mask: maskBase64,
          prompt: prompt || "extend the background content naturally, maintain style and colors"
        })
      });
      if (!response.ok) throw new Error('OpenAI API failed');
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'OpenAI inpainting failed');
      const img = new Image();
      return new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load AI result'));
        img.src = data.result;
        setTimeout(() => reject(new Error('AI request timeout')), 10000);
      });
    } catch (error) {
      console.error('OpenAI inpainting error:', error);
      return null;
    }
  }

  static async callHuggingFaceLaMa(
    imageBase64: string,
    maskBase64: string,
    prompt?: string
  ): Promise<HTMLImageElement | null> {
    try {
      const response = await fetch('https://rvipdpzpeqbmdpavhojs.supabase.co/functions/v1/inpaint-huggingface', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          mask: maskBase64,
          prompt
        })
      });
      if (!response.ok) throw new Error('HuggingFace API failed');
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'HuggingFace inpainting failed');
      const img = new Image();
      return new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load AI result'));
        img.src = data.result;
        setTimeout(() => reject(new Error('AI request timeout')), 10000);
      });
    } catch (error) {
      console.error('HuggingFace LaMa error:', error);
      return null;
    }
  }
}

