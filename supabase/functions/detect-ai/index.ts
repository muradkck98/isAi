// ─── Supabase Edge Function: detect-ai ────────────────────────────────────────
// Proxies AI detection requests so API keys never reach the mobile client.
// Deploy: supabase functions deploy detect-ai
// Set secrets: supabase secrets set SIGHTENGINE_API_USER=xxx SIGHTENGINE_API_SECRET=yyy
//
// Request body:  { image_url: string }
// Response body: { probability: number }  (0–100, where 100 = definitely AI)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image_url } = await req.json();

    if (!image_url) {
      return new Response(
        JSON.stringify({ error: 'image_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Option A: Sightengine ───────────────────────────────────────────────
    // Sign up at https://sightengine.com — free tier: 2000 ops/month
    const apiUser   = Deno.env.get('SIGHTENGINE_API_USER');
    const apiSecret = Deno.env.get('SIGHTENGINE_API_SECRET');

    if (apiUser && apiSecret) {
      const params = new URLSearchParams({
        url: image_url,
        models: 'genai',
        api_user: apiUser,
        api_secret: apiSecret,
      });

      const response = await fetch(
        `https://api.sightengine.com/1.0/check.json?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Sightengine API error: ${response.status}`);
      }

      const data = await response.json();
      // Sightengine returns type.ai_generated as 0–1 float
      const probability = Math.round((data?.type?.ai_generated ?? 0) * 100 * 10) / 10;

      return new Response(
        JSON.stringify({ probability }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Option B: Hive Moderation ───────────────────────────────────────────
    // Sign up at https://hivemoderation.com
    const hiveKey = Deno.env.get('HIVE_AI_API_KEY');

    if (hiveKey) {
      const response = await fetch('https://api.thehive.ai/api/v2/task/sync', {
        method: 'POST',
        headers: {
          Authorization: `Token ${hiveKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: image_url,
        }),
      });

      if (!response.ok) {
        throw new Error(`Hive AI API error: ${response.status}`);
      }

      const data = await response.json();
      // Extract AI-generated score from Hive response
      const aiScore = data?.status?.[0]?.response?.output?.[0]?.classes?.find(
        (c: { class: string; score: number }) => c.class === 'ai_generated'
      )?.score ?? 0;

      const probability = Math.round(aiScore * 100 * 10) / 10;

      return new Response(
        JSON.stringify({ probability }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── Fallback: No API key configured ────────────────────────────────────
    return new Response(
      JSON.stringify({ error: 'No AI detection API configured. Set SIGHTENGINE_API_USER/SECRET or HIVE_AI_API_KEY.' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
