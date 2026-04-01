import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      throw new Error("CLAUDE_API_KEY is not configured");
    }

    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64 || !mimeType) {
      return new Response(
        JSON.stringify({ error: "imageBase64 and mimeType are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert geotechnical engineer specialising in Australian Standard AS 1726:2017 soil classification. 
Analyse the provided soil/core photo and return a JSON object with your best assessment. Use ONLY these exact field names and allowed values:

{
  "primarySoilType": one of "CLAY","SILT","SAND","GRAVEL","COBBLES","BOULDERS","FILL","TOPSOIL","PEAT","ROCK",
  "secondaryDescriptors": array of zero or more from ["Silty","Sandy","Clayey","Gravelly"],
  "plasticity": one of "low","medium","high" or "" if not determinable,
  "colour": a colour string like "brown", "dark grey", "red-brown" etc.,
  "colourBecoming": optional second colour or "",
  "minorComponents": array of zero or more from ["trace gravel","trace sand","trace silt","trace clay","some gravel","some sand","some silt","some clay","with rootlets","with organics","with rock fragments","with calcareous nodules"],
  "confidence": "low" | "medium" | "high",
  "notes": a short sentence explaining your reasoning
}

Return ONLY valid JSON, no markdown fences or extra text.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: "Analyse this soil/core sample photo and classify it per AS 1726:2017.",
              },
            ],
          },
        ],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude API error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `Claude API error [${response.status}]: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    let classification;
    try {
      classification = JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    return new Response(JSON.stringify(classification), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-soil error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
