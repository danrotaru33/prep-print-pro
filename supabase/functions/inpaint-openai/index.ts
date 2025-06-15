
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
    const { image, mask, prompt } = await req.json();
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Processing OpenAI DALL-E inpainting request...');

    // Convert base64 to blob for OpenAI API
    const imageBlob = await fetch(image).then(res => res.blob());
    const maskBlob = await fetch(mask).then(res => res.blob());

    const formData = new FormData();
    formData.append('image', imageBlob, 'image.png');
    formData.append('mask', maskBlob, 'mask.png');
    formData.append('prompt', prompt || 'extend the background naturally');
    formData.append('n', '1');
    formData.append('size', '512x512');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const data = await response.json();
    const resultUrl = data.data[0].url;

    // Convert result to base64 for easier handling
    const resultResponse = await fetch(resultUrl);
    const resultBuffer = await resultResponse.arrayBuffer();
    const base64Result = btoa(String.fromCharCode(...new Uint8Array(resultBuffer)));

    return new Response(
      JSON.stringify({ 
        result: `data:image/png;base64,${base64Result}`,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OpenAI inpainting error:', error);
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
