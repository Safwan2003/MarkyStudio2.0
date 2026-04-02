import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Google Veo 2 (AI Video) Placeholder Endpoint — Tier 1 of the 3-tier system
// In a production environment, this would call the Google GenAI Video API.
// For now, it returns a cinematically matched stock fallback based on the prompt expansion.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt?.trim()) {
    return new Response(JSON.stringify({ error: "Missing prompt" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  
  // Expansion logic: map prompt keywords to premium stock/AI fallbacks
  const p = prompt.toLowerCase();
  let fallbackUrl = "https://player.vimeo.com/external/494254254.hd.mp4?s=6c2ef531273934d40245a443a0e676d49931e5f1&profile_id=175"; // Default liquid abstract

  if (p.includes("blue") || p.includes("tech")) {
    fallbackUrl = "https://player.vimeo.com/external/494252668.hd.mp4?s=6a98299d4533fd00e676d49931e5f1&profile_id=175";
  } else if (p.includes("gold") || p.includes("premium")) {
    fallbackUrl = "https://player.vimeo.com/external/459389137.hd.mp4?s=82c23f11273934d40245a443a0e676d49931e5f1&profile_id=175";
  } else if (p.includes("dark") || p.includes("space")) {
    fallbackUrl = "https://player.vimeo.com/external/368735327.hd.mp4?s=82c23f11273934d40245a443a0e676d49931e5f1&profile_id=175";
  }

  return new Response(JSON.stringify({ 
    url: fallbackUrl,
    provider: "veo-2-proxy",
    originalPrompt: prompt
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
