import { CanvasContext } from "./types";

export class AIBleedProcessor {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor({ canvas, ctx }: CanvasContext) {
    this.canvas = canvas;
    this.ctx = ctx;
  }

  /**
   * Main AI-powered bleed extension logic.
   * Extend *all* white padding in bleed margin, not just "content-aware" edges.
   */
  async processIntelligentBleed(
    bleedPixels: number,
    finalWidth: number,
    finalHeight: number
  ): Promise<void> {
    console.log('=== AI BLEED PROCESSING START ===');
    console.log(`Processing intelligent bleed with ${bleedPixels}px margin (now extends entire white padding)`);

    try {
      // Step 1: Target the entire bleed areas -- all four sides!
      const marginAreas = this.extractAllBleedMarginAreas(bleedPixels, finalWidth, finalHeight);
      console.log(`Extracted ${marginAreas.length} (FULL bleed) margin areas to fill with AI.`);

      // Step 2: Process each margin area with AI
      for (const area of marginAreas) {
        await this.processMarginArea(area, null);
      }

      console.log('=== AI BLEED PROCESSING COMPLETE ===');
    } catch (error) {
      console.error('AI bleed processing failed, keeping white padding:', error);
      // Fallback: keep original white padding
    }
  }

  /**
   * New: Extract ALL BLEED regions (top, bottom, left, right),
   * not just what is not covered by content.
   */
  private extractAllBleedMarginAreas(
    bleedPixels: number,
    finalWidth: number,
    finalHeight: number
  ) {
    const areas = [];

    // Full canvas area includes bleed
    const canvasWidth = finalWidth + bleedPixels * 2;
    const canvasHeight = finalHeight + bleedPixels * 2;

    // Top bleed area
    areas.push({
      type: 'top',
      x: 0,
      y: 0,
      width: canvasWidth,
      height: bleedPixels,
      contextX: 0,
      contextY: bleedPixels,
      contextWidth: canvasWidth,
      contextHeight: Math.min(40, finalHeight) // Just a small context slice from inside
    });
    // Bottom bleed area
    areas.push({
      type: 'bottom',
      x: 0,
      y: bleedPixels + finalHeight,
      width: canvasWidth,
      height: bleedPixels,
      contextX: 0,
      contextY: bleedPixels + finalHeight - Math.min(40, finalHeight),
      contextWidth: canvasWidth,
      contextHeight: Math.min(40, finalHeight)
    });
    // Left bleed area
    areas.push({
      type: 'left',
      x: 0,
      y: bleedPixels,
      width: bleedPixels,
      height: finalHeight,
      contextX: bleedPixels,
      contextY: bleedPixels,
      contextWidth: Math.min(40, finalWidth),
      contextHeight: finalHeight
    });
    // Right bleed area
    areas.push({
      type: 'right',
      x: bleedPixels + finalWidth,
      y: bleedPixels,
      width: bleedPixels,
      height: finalHeight,
      contextX: bleedPixels + finalWidth - Math.min(40, finalWidth),
      contextY: bleedPixels,
      contextWidth: Math.min(40, finalWidth),
      contextHeight: finalHeight
    });

    return areas;
  }

  private detectContentBounds(
    bleedPixels: number,
    finalWidth: number,
    finalHeight: number
  ): { left: number; top: number; right: number; bottom: number } | null {
    console.log('Detecting content boundaries...');
    
    const contentArea = {
      x: bleedPixels,
      y: bleedPixels,
      width: finalWidth,
      height: finalHeight
    };

    const imageData = this.ctx.getImageData(
      contentArea.x,
      contentArea.y,
      contentArea.width,
      contentArea.height
    );

    let minX = contentArea.width;
    let minY = contentArea.height;
    let maxX = 0;
    let maxY = 0;

    // Scan for non-white pixels
    for (let y = 0; y < contentArea.height; y++) {
      for (let x = 0; x < contentArea.width; x++) {
        const index = (y * contentArea.width + x) * 4;
        const r = imageData.data[index];
        const g = imageData.data[index + 1];
        const b = imageData.data[index + 2];
        const a = imageData.data[index + 3];

        // Check if pixel is not white (with some tolerance)
        if (r < 250 || g < 250 || b < 250 || a < 250) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (minX >= maxX || minY >= maxY) {
      return null; // No content found
    }

    return {
      left: bleedPixels + minX,
      top: bleedPixels + minY,
      right: bleedPixels + maxX,
      bottom: bleedPixels + maxY
    };
  }

  private extractMarginAreas(
    contentBounds: { left: number; top: number; right: number; bottom: number },
    bleedPixels: number,
    finalWidth: number,
    finalHeight: number
  ) {
    const areas = [];
    const canvasWidth = finalWidth + (bleedPixels * 2);
    const canvasHeight = finalHeight + (bleedPixels * 2);

    // Top margin
    if (contentBounds.top > bleedPixels) {
      areas.push({
        type: 'top',
        x: bleedPixels,
        y: bleedPixels,
        width: finalWidth,
        height: contentBounds.top - bleedPixels,
        contextX: bleedPixels,
        contextY: contentBounds.top,
        contextWidth: finalWidth,
        contextHeight: Math.min(50, contentBounds.bottom - contentBounds.top)
      });
    }

    // Bottom margin
    if (contentBounds.bottom < bleedPixels + finalHeight) {
      areas.push({
        type: 'bottom',
        x: bleedPixels,
        y: contentBounds.bottom,
        width: finalWidth,
        height: (bleedPixels + finalHeight) - contentBounds.bottom,
        contextX: bleedPixels,
        contextY: Math.max(contentBounds.bottom - 50, contentBounds.top),
        contextWidth: finalWidth,
        contextHeight: Math.min(50, contentBounds.bottom - contentBounds.top)
      });
    }

    // Left margin
    if (contentBounds.left > bleedPixels) {
      areas.push({
        type: 'left',
        x: bleedPixels,
        y: bleedPixels,
        width: contentBounds.left - bleedPixels,
        height: finalHeight,
        contextX: contentBounds.left,
        contextY: bleedPixels,
        contextWidth: Math.min(50, contentBounds.right - contentBounds.left),
        contextHeight: finalHeight
      });
    }

    // Right margin
    if (contentBounds.right < bleedPixels + finalWidth) {
      areas.push({
        type: 'right',
        x: contentBounds.right,
        y: bleedPixels,
        width: (bleedPixels + finalWidth) - contentBounds.right,
        height: finalHeight,
        contextX: Math.max(contentBounds.right - 50, contentBounds.left),
        contextY: bleedPixels,
        contextWidth: Math.min(50, contentBounds.right - contentBounds.left),
        contextHeight: finalHeight
      });
    }

    return areas;
  }

  private async processMarginArea(area: any, contentBounds: any): Promise<void> {
    console.log(`Processing ${area.type} margin area...`);

    try {
      // Create context image for AI inpainting
      const contextCanvas = document.createElement('canvas');
      const contextCtx = contextCanvas.getContext('2d')!;
      
      // Size for AI processing (reasonable for API limits)
      const maxDimension = 512;
      const scale = Math.min(
        maxDimension / Math.max(area.width + area.contextWidth, area.height + area.contextHeight),
        1
      );

      contextCanvas.width = Math.round((area.width + area.contextWidth) * scale);
      contextCanvas.height = Math.round((area.height + area.contextHeight) * scale);

      // Fill with white background
      contextCtx.fillStyle = '#FFFFFF';
      contextCtx.fillRect(0, 0, contextCanvas.width, contextCanvas.height);

      // Draw context (existing content) scaled
      const sourceX = Math.min(area.x, area.contextX);
      const sourceY = Math.min(area.y, area.contextY);
      const sourceWidth = Math.max(area.x + area.width, area.contextX + area.contextWidth) - sourceX;
      const sourceHeight = Math.max(area.y + area.height, area.contextY + area.contextHeight) - sourceY;

      contextCtx.drawImage(
        this.canvas,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, contextCanvas.width, contextCanvas.height
      );

      // Create mask for the area to fill
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = contextCanvas.width;
      maskCanvas.height = contextCanvas.height;
      const maskCtx = maskCanvas.getContext('2d')!;
      
      // Black background (masked area)
      maskCtx.fillStyle = '#000000';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
      
      // White area to fill (the margin area)
      maskCtx.fillStyle = '#FFFFFF';
      const fillX = Math.round((area.x - sourceX) * scale);
      const fillY = Math.round((area.y - sourceY) * scale);
      const fillWidth = Math.round(area.width * scale);
      const fillHeight = Math.round(area.height * scale);
      maskCtx.fillRect(fillX, fillY, fillWidth, fillHeight);

      // Try AI inpainting
      const filledImage = await this.tryAIInpainting(contextCanvas, maskCanvas);
      
      if (filledImage) {
        // Extract and apply the filled area back to main canvas
        this.applyFilledArea(filledImage, area, sourceX, sourceY, sourceWidth, sourceHeight, scale);
        console.log(`Successfully filled ${area.type} margin with AI`);
      } else {
        console.log(`AI inpainting failed for ${area.type} margin, keeping white`);
      }

    } catch (error) {
      console.error(`Error processing ${area.type} margin:`, error);
      // Keep original white margin on error
    }
  }

  private async tryAIInpainting(contextCanvas: HTMLCanvasElement, maskCanvas: HTMLCanvasElement): Promise<HTMLImageElement | null> {
    console.log('Attempting AI inpainting...');

    try {
      // Convert canvases to base64
      const imageBase64 = contextCanvas.toDataURL('image/png');
      const maskBase64 = maskCanvas.toDataURL('image/png');

      // Try OpenAI DALL-E inpainting first (usually better quality)
      try {
        const result = await this.callOpenAIInpainting(imageBase64, maskBase64);
        if (result) return result;
      } catch (error) {
        console.log('OpenAI inpainting failed, trying HuggingFace LaMa...');
      }

      // Fallback to HuggingFace LaMa
      try {
        const result = await this.callHuggingFaceLaMa(imageBase64, maskBase64);
        if (result) return result;
      } catch (error) {
        console.log('HuggingFace LaMa failed');
      }

      return null;
    } catch (error) {
      console.error('AI inpainting completely failed:', error);
      return null;
    }
  }

  private async callOpenAIInpainting(imageBase64: string, maskBase64: string): Promise<HTMLImageElement | null> {
    // Call the Supabase edge function for OpenAI DALL-E inpainting
    console.log('Calling OpenAI DALL-E inpainting...');
    
    try {
      const response = await fetch('https://rvipdpzpeqbmdpavhojs.supabase.co/functions/v1/inpaint-openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          mask: maskBase64,
          prompt: "extend the background content naturally, maintain style and colors"
        })
      });

      if (!response.ok) throw new Error('OpenAI API failed');
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'OpenAI inpainting failed');
      }
      
      const img = new Image();
      return new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load AI result'));
        img.src = data.result;
        
        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('AI request timeout')), 10000);
      });
    } catch (error) {
      console.error('OpenAI inpainting error:', error);
      return null;
    }
  }

  private async callHuggingFaceLaMa(imageBase64: string, maskBase64: string): Promise<HTMLImageElement | null> {
    // Call the Supabase edge function for HuggingFace LaMa
    console.log('Calling HuggingFace LaMa...');
    
    try {
      const response = await fetch('https://rvipdpzpeqbmdpavhojs.supabase.co/functions/v1/inpaint-huggingface', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          mask: maskBase64
        })
      });

      if (!response.ok) throw new Error('HuggingFace API failed');
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'HuggingFace inpainting failed');
      }
      
      const img = new Image();
      return new Promise((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load AI result'));
        img.src = data.result;
        
        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('AI request timeout')), 10000);
      });
    } catch (error) {
      console.error('HuggingFace LaMa error:', error);
      return null;
    }
  }

  private applyFilledArea(
    filledImage: HTMLImageElement,
    area: any,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number,
    scale: number
  ): void {
    console.log('Applying filled area back to main canvas...');

    // Create temporary canvas to extract just the filled portion
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.round(area.width);
    tempCanvas.height = Math.round(area.height);
    const tempCtx = tempCanvas.getContext('2d')!;

    // Calculate coordinates in the filled image
    const fillX = (area.x - sourceX) * scale;
    const fillY = (area.y - sourceY) * scale;
    const fillWidth = area.width * scale;
    const fillHeight = area.height * scale;

    // Draw the relevant portion from the filled image
    tempCtx.drawImage(
      filledImage,
      fillX, fillY, fillWidth, fillHeight,
      0, 0, tempCanvas.width, tempCanvas.height
    );

    // Apply to main canvas
    this.ctx.drawImage(tempCanvas, area.x, area.y);
  }
}
