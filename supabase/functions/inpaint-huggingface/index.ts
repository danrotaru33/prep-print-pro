
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, mask } = await req.json();
    const huggingFaceToken = Deno.env.get('HUGGING_FACE_ACCESS_TOKEN');

    if (!huggingFaceToken) {
      throw new Error('HuggingFace API token not configured');
    }

    console.log('Processing HuggingFace LaMa inpainting request...');

    // Convert base64 images to binary
    const imageBuffer = Uint8Array.from(atob(image.split(',')[1]), c => c.charCodeAt(0));
    const maskBuffer = Uint8Array.from(atob(mask.split(',')[1]), c => c.charCodeAt(0));

    const formData = new FormData();
    formData.append('image', new Blob([imageBuffer], { type: 'image/png' }), 'image.png');
    formData.append('mask_image', new Blob([maskBuffer], { type: 'image/png' }), 'mask.png');

    const response = await fetch(
      'https://api-inference.huggingface.co/models/facebook/lama-inpainting',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${huggingFaceToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('HuggingFace API error:', errorText);
      throw new Error(`HuggingFace API failed: ${response.status}`);
    }

    const resultBuffer = await response.arrayBuffer();
    const base64Result = btoa(String.fromCharCode(...new Uint8Array(resultBuffer)));

    return new Response(
      JSON.stringify({ 
        result: `data:image/png;base64,${base64Result}`,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('HuggingFace inpainting error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
