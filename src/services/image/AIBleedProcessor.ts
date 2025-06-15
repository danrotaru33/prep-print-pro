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
        console.log(`[AIBleedProcessor] Filling area:`, area);
        await this.processMarginArea(area, null);
      }

      // NEW: After AI, forcibly fill any "white" bleed area left with nearest edge pixels (content-aware clone)
      this.finalFillBleedFromEdge(bleedPixels, finalWidth, finalHeight);

      // Debug: mark any areas that are suspiciously still white
      this.debugFillUnfilledBleed(bleedPixels, finalWidth, finalHeight);

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

    // Top bleed area (full width, first bleedPixels rows)
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
    // Bottom bleed area (full width, last bleedPixels rows)
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
    // Left bleed area (full height, first bleedPixels columns)
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
    // Right bleed area (full height, last bleedPixels columns)
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
    console.log(`Processing ${area.type} margin area... Area:`, JSON.stringify(area, null, 2));

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

      // Show in devtools
      console.log(`[AIInpaint] contextCanvas area for ${area.type}`, contextCanvas.toDataURL().slice(0,80)+'...');

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

      console.log(`[AIInpaint] maskCanvas for ${area.type}`, maskCanvas.toDataURL().slice(0,80)+'...');

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

  /**
   * Attempts AI inpainting. 
   * Now prioritizes HuggingFace LaMa first, and only falls back to OpenAI DALL-E if LaMa fails.
   */
  private async tryAIInpainting(contextCanvas: HTMLCanvasElement, maskCanvas: HTMLCanvasElement): Promise<HTMLImageElement | null> {
    console.log('Attempting AI inpainting, preferring HuggingFace LaMa first...');

    try {
      // Convert canvases to base64
      const imageBase64 = contextCanvas.toDataURL('image/png');
      const maskBase64 = maskCanvas.toDataURL('image/png');

      // HuggingFace LaMa is now the primary inpainting backend
      try {
        console.log('Calling HuggingFace LaMa (preferred)...');
        const result = await this.callHuggingFaceLaMa(imageBase64, maskBase64);
        if (result) {
          console.log('HuggingFace LaMa inpainting succeeded.');
          return result;
        }
      } catch (error) {
        console.log('HuggingFace LaMa failed, trying OpenAI DALL-E fallback...', error);
      }

      // Fallback to OpenAI DALL-E
      try {
        console.log('Calling OpenAI DALL-E fallback...');
        const result = await this.callOpenAIInpainting(imageBase64, maskBase64);
        if (result) {
          console.log('OpenAI DALL-E inpainting succeeded as fallback.');
          return result;
        }
      } catch (error) {
        console.log('OpenAI inpainting (fallback) failed');
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

  /**
   * After all AI is done, fill ALL bleed pixels still nearly-white with the content pixel from the nearest edge.
   * This prevents any white lines/gaps, even if AI leaves small holes or soft edges.
   * This works like the BleedProcessor fallback, but forcibly runs after AI.
   */
  private finalFillBleedFromEdge(
    bleedPixels: number,
    finalWidth: number,
    finalHeight: number
  ): void {
    const canvasWidth = finalWidth + bleedPixels * 2;
    const canvasHeight = finalHeight + bleedPixels * 2;
    const imageData = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const { data, width, height } = imageData;

    let replacedCount = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Only process pixels in the BLEED region outside the main content
        if (
          x < bleedPixels ||
          x >= bleedPixels + finalWidth ||
          y < bleedPixels ||
          y >= bleedPixels + finalHeight
        ) {
          const idx = (y * width + x) * 4;
          const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
          // "Nearly white" and opaque pixel: should be filled
          if (r > 235 && g > 235 && b > 235 && a > 200) {
            // Get nearest content edge pixel in main area
            let srcX = x;
            let srcY = y;
            if (x < bleedPixels) srcX = bleedPixels;
            else if (x >= bleedPixels + finalWidth) srcX = bleedPixels + finalWidth - 1;
            if (y < bleedPixels) srcY = bleedPixels;
            else if (y >= bleedPixels + finalHeight) srcY = bleedPixels + finalHeight - 1;
            const srcIdx = (srcY * width + srcX) * 4;
            data[idx] = data[srcIdx];
            data[idx + 1] = data[srcIdx + 1];
            data[idx + 2] = data[srcIdx + 2];
            data[idx + 3] = data[srcIdx + 3];
            replacedCount++;
          }
        }
      }
    }
    if (replacedCount > 0) {
      console.log(`[AIBleedProcessor] [finalFillBleedFromEdge] Filled ${replacedCount} white/near-white bleed pixels from nearest content edge`);
      this.ctx.putImageData(imageData, 0, 0);
    } else {
      console.log('[AIBleedProcessor] [finalFillBleedFromEdge] No white bleed pixels needed filling');
    }
  }

  /** 
   * Extra visible debug: Fill unfilled (still white) bleed margins with semi-transparent hotpink.
   * This makes it obvious what margins haven't been filled.
   */
  private debugFillUnfilledBleed(bleedPixels: number, finalWidth: number, finalHeight: number): void {
    // Only for debugging, won't affect print—you can remove later
    const canvasWidth = finalWidth + bleedPixels * 2;
    const canvasHeight = finalHeight + bleedPixels * 2;
    let outCount = 0;
    const imageData = this.ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const data = imageData.data;
    // If too many white pixels, we highlight the margin
    let isTopWhite = true;
    let isBottomWhite = true;
    let isLeftWhite = true;
    let isRightWhite = true;
    // Check top
    for (let y = 0; y < bleedPixels; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const idx = (y * canvasWidth + x) * 4;
        if (data[idx] !== 255 || data[idx+1] !== 255 || data[idx+2] !== 255) {
          isTopWhite = false; break;
        }
      }
      if (!isTopWhite) break;
    }
    // Check bottom
    for (let y = canvasHeight-bleedPixels; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const idx = (y * canvasWidth + x) * 4;
        if (data[idx] !== 255 || data[idx+1] !== 255 || data[idx+2] !== 255) {
          isBottomWhite = false; break;
        }
      }
      if (!isBottomWhite) break;
    }
    // Check left
    for (let x = 0; x < bleedPixels; x++) {
      for (let y = 0; y < canvasHeight; y++) {
        const idx = (y * canvasWidth + x) * 4;
        if (data[idx] !== 255 || data[idx+1] !== 255 || data[idx+2] !== 255) {
          isLeftWhite = false; break;
        }
      }
      if (!isLeftWhite) break;
    }
    // Check right
    for (let x = canvasWidth-bleedPixels; x < canvasWidth; x++) {
      for (let y = 0; y < canvasHeight; y++) {
        const idx = (y * canvasWidth + x) * 4;
        if (data[idx] !== 255 || data[idx+1] !== 255 || data[idx+2] !== 255) {
          isRightWhite = false; break;
        }
      }
      if (!isRightWhite) break;
    }

    // Overlay color if found pure white
    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    if (isTopWhite) {
      this.ctx.fillStyle = '#ff70fa';
      this.ctx.fillRect(0,0,canvasWidth,bleedPixels);
      outCount++;
      console.warn('[AI-Bleed Debug] Top margin still pure white in output');
    }
    if (isBottomWhite) {
      this.ctx.fillStyle = '#ff70fa';
      this.ctx.fillRect(0,canvasHeight-bleedPixels,canvasWidth,bleedPixels);
      outCount++;
      console.warn('[AI-Bleed Debug] Bottom margin still pure white in output');
    }
    if (isLeftWhite) {
      this.ctx.fillStyle = '#ff70fa';
      this.ctx.fillRect(0,0,bleedPixels,canvasHeight);
      outCount++;
      console.warn('[AI-Bleed Debug] Left margin still pure white in output');
    }
    if (isRightWhite) {
      this.ctx.fillStyle = '#ff70fa';
      this.ctx.fillRect(canvasWidth-bleedPixels,0,bleedPixels,canvasHeight);
      outCount++;
      console.warn('[AI-Bleed Debug] Right margin still pure white in output');
    }
    this.ctx.restore();
    if (outCount > 0) {
      console.warn(`[AI-Bleed Debug] ${outCount} margins have not been filled by AI and remain white`);
    }
  }
}
