import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('HF Outpaint function called');
    
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    const width = parseInt(formData.get('width') as string) || 1024;
    const height = parseInt(formData.get('height') as string) || 1024;
    const prompt = formData.get('prompt') as string || "Extend image naturally";
    
    if (!imageFile) {
      throw new Error('No image file provided');
    }

    console.log(`Processing image: ${imageFile.name}, size: ${imageFile.size}, target: ${width}x${height}`);

    // Convert image file to base64 for HF API
    const imageBuffer = await imageFile.arrayBuffer();
    const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
    const imageDataUrl = `data:${imageFile.type};base64,${imageBase64}`;

    // Call Hugging Face Space API
    const hfResponse = await fetch('https://fffiloni-diffusers-image-outpaint.hf.space/api/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: [
          imageDataUrl, // image
          width, // width
          height, // height
          10, // overlap_percentage
          8, // num_inference_steps
          "Full", // resize_option
          50, // custom_resize_percentage
          prompt, // prompt_input
          "Middle", // alignment
          true, // overlap_left
          true, // overlap_right
          true, // overlap_top
          true, // overlap_bottom
        ],
        fn_index: 0
      }),
    });

    if (!hfResponse.ok) {
      const errorText = await hfResponse.text();
      console.error('HF API error:', errorText);
      throw new Error(`Hugging Face API error: ${hfResponse.status} - ${errorText}`);
    }

    const hfResult = await hfResponse.json();
    console.log('HF API response received');

    if (!hfResult.data || !hfResult.data[0]) {
      throw new Error('Invalid response from Hugging Face API');
    }

    // Extract the result image URL or base64
    const resultImageUrl = hfResult.data[0];
    
    if (resultImageUrl.startsWith('data:image')) {
      // Return base64 image directly
      return new Response(
        JSON.stringify({ 
          success: true, 
          imageUrl: resultImageUrl,
          message: 'Image outpainted successfully' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Fetch the image from HF and return as base64
      const imageResponse = await fetch(resultImageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch processed image from Hugging Face');
      }
      
      const imageArrayBuffer = await imageResponse.arrayBuffer();
      const processedImageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageArrayBuffer)));
      const processedImageDataUrl = `data:image/png;base64,${processedImageBase64}`;

      return new Response(
        JSON.stringify({ 
          success: true, 
          imageUrl: processedImageDataUrl,
          message: 'Image outpainted successfully' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in HF outpaint function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to process image with AI outpainting',
        fallback: true 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});