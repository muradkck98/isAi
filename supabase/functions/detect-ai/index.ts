// ─── Supabase Edge Function: detect-ai ────────────────────────────────────────
// Accepts either:
//   { image_base64: string, mime_type?: string }  — for local files (camera/gallery)
//   { image_url: string }                          — for social/web images
// Response: { probability: number, deepfake: number, generators: Record<string,number> }

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { image_base64, image_url, mime_type = 'image/jpeg' } = body;

    if (!image_base64 && !image_url) {
      return new Response(
        JSON.stringify({ error: 'image_base64 or image_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiUser   = Deno.env.get('SIGHTENGINE_API_USER');
    const apiSecret = Deno.env.get('SIGHTENGINE_API_SECRET');

    if (!apiUser || !apiSecret) {
      return new Response(
        JSON.stringify({ error: 'SIGHTENGINE credentials not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let sightengineResponse: Response;

    if (image_url) {
      // ── URL mode: pass URL directly via query params (GET) ──────────────────
      const params = new URLSearchParams({
        url:        image_url,
        models:     'genai',
        api_user:   apiUser,
        api_secret: apiSecret,
      });

      sightengineResponse = await fetch(
        `https://api.sightengine.com/1.0/check.json?${params.toString()}`,
        { method: 'GET' }
      );
    } else {
      // ── Base64 mode: decode → binary → multipart/form-data (POST) ───────────
      const binaryStr = atob(image_base64!);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const formData = new FormData();
      formData.append('media', new Blob([bytes], { type: mime_type }), 'image.jpg');
      formData.append('models',     'genai');
      formData.append('api_user',   apiUser);
      formData.append('api_secret', apiSecret);

      sightengineResponse = await fetch('https://api.sightengine.com/1.0/check.json', {
        method: 'POST',
        body:   formData,
      });
    }

    if (!sightengineResponse.ok) {
      const text = await sightengineResponse.text();
      throw new Error(`Sightengine error ${sightengineResponse.status}: ${text}`);
    }

    const data = await sightengineResponse.json();

    if (data.status !== 'success') {
      throw new Error(data.error?.message ?? `Sightengine failure: ${JSON.stringify(data)}`);
    }

    const probability = Math.round((data?.type?.ai_generated ?? 0) * 100 * 10) / 10;
    const deepfake    = Math.round((data?.type?.deepfake    ?? 0) * 100 * 10) / 10;

    const rawGenerators: Record<string, number> = data?.type?.ai_generators ?? {};
    const generators: Record<string, number> = {};
    for (const [key, val] of Object.entries(rawGenerators)) {
      const pct = Math.round((val as number) * 100 * 10) / 10;
      if (pct > 0) generators[key] = pct;
    }

    return new Response(
      JSON.stringify({ probability, deepfake, generators }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
